// The notifications centre: every reminder in the app, in one list.
// Same sources as Home and phone notifications, so nothing is missed and nothing is shown twice.
import type { Bill } from '@/types/bill';
import type { Investment } from '@/types/investment';
import type { Iou } from '@/types/iou';
import type { InboxMark, Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';
import { cardReminders, verifiedAgo, type AccountBalance } from './accounts';
import { overallBudget } from './budgets';
import { debtPlanReminders, debtPlanSummary } from './debtPlan';
import { moneyReminders, type MoneyReminder } from './debtReminders';
import { formatINR } from './format';
import { upcomingBills } from './moneyHealth';
import { minBalanceRisk } from './payday';
import { sipReminders } from './sip';

export type InboxKind = 'people' | 'card' | 'bill' | 'sip' | 'debt' | 'budget' | 'checkin' | 'low';
export type InboxGroup = 'overdue' | 'today' | 'week' | 'later';
export type InboxItem = { id: string; kind: InboxKind; when: Date; title: string; body: string; href: string; group: InboxGroup; billId?: string; amount?: number };

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function groupFor(when: Date, now: Date, overdue = false): InboxGroup {
  const today = startOfDay(now).getTime();
  const t = startOfDay(when).getTime();
  if (overdue || t < today) return 'overdue';
  if (t === today) return 'today';
  return t - today <= 7 * DAY ? 'week' : 'later';
}

export function buildInbox(p: {
  ious: Iou[]; accounts: AccountBalance[]; bills: Bill[]; investments: Investment[]; settings: Settings; monthTx: Transaction[]; now?: Date;
}): InboxItem[] {
  const now = p.now ?? new Date();
  const horizon = now.getTime() + 30 * DAY;
  const out: InboxItem[] = [];
  const from = (r: MoneyReminder, kind: InboxKind, href: string) => {
    if (r.when.getTime() > horizon) return;
    out.push({ id: r.id, kind, when: r.when, title: r.title, body: r.body, href: r.href ?? href, group: groupFor(r.when, now, r.urgency === 'overdue') });
  };

  // money with people: ask / pay / interest / instalments
  for (const r of moneyReminders(p.ious, now)) from(r, 'people', '/ious');
  // credit card bills
  for (const r of cardReminders(p.accounts, now)) from(r, 'card', '/accounts');
  // recurring bills & EMIs (unpaid ones this month show as overdue once the date passes)
  for (const u of upcomingBills(p.bills, now, 30)) {
    const days = Math.round((startOfDay(u.due).getTime() - startOfDay(now).getTime()) / DAY);
    out.push({
      id: `bill:${u.bill.id}:${u.due.toISOString().slice(0, 10)}`, kind: 'bill', when: u.due,
      title: `${u.bill.name} ${u.bill.variable ? `(about ${formatINR(u.amount)})` : formatINR(u.amount)}`,
      body: days < 0 ? `Was due ${-days} day${days === -1 ? '' : 's'} ago — paid it? Mark it in Bills` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due ${u.due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      href: `/bill/${u.bill.id}`, group: groupFor(u.due, now), billId: u.bill.id, amount: u.amount,
    });
  }
  // SIPs
  for (const r of sipReminders(p.investments, now)) from(r, 'sip', '/invest');
  // debt plan: extra payment on pay day
  const plan = debtPlanSummary({ ious: p.ious, bills: p.bills, accounts: p.accounts, plan: p.settings.debtPlan, cycleStartDay: p.settings.cycleStartDay, now });
  if (plan.askNow && plan.first)
    out.push({ id: `debtplan:${plan.cycleKey}:ask`, kind: 'debt', when: now, title: `Put ${formatINR(plan.extra)} extra on ${plan.first.name}`, body: 'Your payoff plan for this month — answer on Home', href: '/', group: 'today' });
  for (const r of debtPlanReminders(plan, p.settings.cycleStartDay, now)) if (r.when > now) from(r, 'debt', '/debts');
  // budget
  const ob = overallBudget(p.monthTx, p.settings.monthlyBudget);
  if (ob && ob.limit > 0 && ob.spent / ob.limit >= 0.8) {
    const pct = Math.round((ob.spent / ob.limit) * 100);
    out.push({
      id: `budget:${now.toISOString().slice(0, 7)}`, kind: 'budget', when: now,
      title: pct >= 100 ? 'Over this month’s budget' : `${pct}% of this month’s budget used`,
      body: pct >= 100 ? `${formatINR(ob.spent - ob.limit)} over your ${formatINR(ob.limit)} limit` : `${formatINR(ob.limit - ob.spent)} left for the rest of the month`,
      href: '/budgets', group: 'today',
    });
  }
  // balances not updated for a week
  const stale = p.accounts.filter((a) => !a.archived && verifiedAgo(a, now).stale);
  if (stale.length)
    out.push({ id: `checkin:${now.toISOString().slice(0, 10)}`, kind: 'checkin', when: now, title: 'Update your balances', body: `${stale.map((a) => a.name).slice(0, 3).join(', ')} — 30 seconds keeps safe-to-spend and net worth right`, href: '/accounts', group: 'today' });

  // low balance: the next 7 days of bills & card dues vs the money in your bank/cash
  out.push(...lowBalanceItems(p.accounts, p.bills, now));

  const order: Record<InboxGroup, number> = { overdue: 0, today: 1, week: 2, later: 3 };
  return out.sort((a, b) => order[a.group] - order[b.group] || a.when.getTime() - b.when.getTime());
}

export const needsAttention = (items: InboxItem[]) => items.filter((i) => i.group === 'overdue' || i.group === 'today').length;

// ─── Done & snooze ───
// A reminder id is one occurrence (this month's rent, this card statement), so "done" never hides next month's.

export function applyMarks(items: InboxItem[], marks: Record<string, InboxMark> = {}, now = new Date()) {
  const shown: InboxItem[] = [], snoozed: (InboxItem & { until: Date })[] = [];
  for (const i of items) {
    const m = marks[baseId(i.id)];
    if (m?.done) continue;
    if (m?.snooze && new Date(m.snooze) > now) {
      snoozed.push({ ...i, until: new Date(m.snooze) });
      continue;
    }
    shown.push(i);
  }
  return { shown, snoozed };
}
// notification ids add ":eve" / ":3d" for the day-before copies — they belong to the same reminder
export const baseId = (id: string) => id.replace(/:(eve|3d)$/, '');

export const snoozeOptions = (now = new Date()) => {
  const at9 = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9);
  const monday = (8 - now.getDay()) % 7 || 7;
  return [
    { label: 'Tomorrow', until: at9(1) },
    { label: 'In 3 days', until: at9(3) },
    { label: 'Next week', until: at9(monday) },
  ];
};

// keep the saved marks small: drop ones older than 60 days
export function pruneMarks(marks: Record<string, InboxMark>, now = new Date()) {
  const cut = now.getTime() - 60 * DAY;
  return Object.fromEntries(Object.entries(marks).filter(([, m]) => new Date(m.done ?? m.snooze ?? 0).getTime() > cut));
}

// ─── Morning briefing: one notification instead of many ───
// "₹230 to spend today · Rent ₹15,000 due today · SIP ₹200 tomorrow · 1 overdue"
export function briefing(items: InboxItem[], safeToday: number | null, on: Date) {
  const day = startOfDay(on).getTime();
  const sameDay = (d: Date) => startOfDay(d).getTime() === day;
  const nextDay = (d: Date) => startOfDay(d).getTime() === day + DAY;
  const dueToday = items.filter((i) => i.group !== 'overdue' && sameDay(i.when));
  const dueTomorrow = items.filter((i) => nextDay(i.when));
  const overdue = items.filter((i) => i.group === 'overdue').length;
  const parts: string[] = [];
  if (safeToday != null) parts.push(safeToday > 0 ? `${formatINR(safeToday)} to spend today` : 'Spend nothing extra today — you’re over');
  for (const i of dueToday.slice(0, 2)) parts.push(`${i.title} today`);
  if (dueToday.length > 2) parts.push(`+${dueToday.length - 2} more today`);
  for (const i of dueTomorrow.slice(0, 1)) parts.push(`${i.title} tomorrow`);
  if (overdue) parts.push(`${overdue} overdue`);
  return {
    title: dueToday.length || overdue ? `Today: ${dueToday.length + overdue} thing${dueToday.length + overdue > 1 ? 's' : ''} to sort` : 'Good morning',
    body: parts.join(' · ') || 'Nothing due today. Log what you spend and you’re done.',
    dueToday, dueTomorrow, overdue,
  };
}

// ─── Low balance ───
export function lowBalanceItems(accounts: AccountBalance[], bills: Bill[], now = new Date()): InboxItem[] {
  const live = accounts.filter((a) => !a.archived);
  if (!live.some((a) => a.type !== 'credit')) return []; // no bank balances entered
  const out: InboxItem[] = [];
  const have = live.filter((a) => a.type !== 'credit').reduce((s, a) => s + Math.max(0, a.balance), 0);
  const week = now.getTime() + 7 * DAY;
  const billsWeek = upcomingBills(bills, now, 7).reduce((s, u) => s + u.amount, 0);
  const cardsWeek = cardReminders(live, now).filter((c) => c.when.getTime() <= week).reduce((s, c) => {
    const a = live.find((x) => x.id === c.iouId);
    return s + Math.max(0, a?.balance ?? 0);
  }, 0);
  const due = billsWeek + cardsWeek;
  const spare = have - due;
  const today = now.toISOString().slice(0, 10);
  if (due > 0 && spare < Math.max(1000, due * 0.1))
    out.push({
      id: `low:week:${today}`, kind: 'low', when: now, href: '/accounts', group: spare < 0 ? 'overdue' : 'today',
      title: spare < 0 ? `${formatINR(-spare)} short for the next 7 days` : `Only ${formatINR(spare)} spare this week`,
      body: `${formatINR(due)} of bills${cardsWeek ? ' & card dues' : ''} due by ${new Date(week).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, and you have ${formatINR(have)} in bank & cash.${spare < 0 ? ' Move money in before then to avoid a bounce or late fee.' : ''}`,
    });
  for (const a of live) {
    const r = minBalanceRisk(a);
    if (!r || !(r.below || r.close)) continue;
    out.push({
      id: `low:min:${a.id}:${today}`, kind: 'low', when: now, href: '/accounts', group: r.below ? 'overdue' : 'today',
      title: r.below ? `${a.name} is below its minimum balance` : `${a.name} is close to its minimum balance`,
      body: `${formatINR(Math.round(a.balance))} now, the bank needs ${formatINR(a.minBalance!)}.${r.below ? ` Add ${formatINR(-r.room)} — banks charge a fee every month you’re below.` : ` Only ${formatINR(r.room)} above it.`}`,
    });
  }
  return out;
}

// ─── Overspent today (8 PM nudge) ───
export function overspentToday(safe: { safeToday: number; spentToday: number; dailyAllowance: number; tomorrowAllowance: number } | null, now = new Date()) {
  if (!safe || safe.spentToday <= 0 || safe.safeToday >= 0 || safe.spentToday <= safe.dailyAllowance) return null;
  return {
    id: `over:${now.toISOString().slice(0, 10)}`,
    title: `${formatINR(safe.spentToday)} spent today — ${formatINR(safe.dailyAllowance)} was your amount`,
    body: `${formatINR(safe.spentToday - safe.dailyAllowance)} over. Tomorrow’s amount drops to about ${formatINR(Math.max(0, safe.tomorrowAllowance))} a day to stay on track.`,
  };
}

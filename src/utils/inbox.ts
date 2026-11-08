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
import { sipReminders } from './sip';

export type InboxKind = 'people' | 'card' | 'bill' | 'sip' | 'debt' | 'budget' | 'checkin';
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

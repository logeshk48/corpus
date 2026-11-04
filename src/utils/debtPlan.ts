// The saved payoff plan, for Home and reminders — level 2:
//  • progress since you started the plan ("₹42,000 paid off since Sep · 16%")
//  • monthly check: "Did you put the extra ₹5,000 into SBI Card?" → streak, or what skipping costs
//  • celebrates each debt you clear, and says where its payment goes next
//  • payday reminder + a follow-up 3 days later if you haven't answered
import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import type { DebtPlanSettings } from '@/types/settings';
import type { AccountBalance } from './accounts';
import { allDebts, debtTotals, type DebtLine } from './allDebts';
import type { MoneyReminder } from './debtReminders';
import { formatINR } from './format';
import { cycleBounds } from './safeToSpend';
import { simulatePayoff } from './payoff';

const DAY = 86_400_000;
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthYear = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

export function debtPlanSummary(p: { ious: Iou[]; bills: Bill[]; accounts: AccountBalance[]; plan?: DebtPlanSettings; cycleStartDay?: number; now?: Date }) {
  const now = p.now ?? new Date();
  const list = allDebts({ ious: p.ious, bills: p.bills, accounts: p.accounts, now });
  const plan = p.plan;
  const strategy = plan?.strategy ?? 'avalanche';
  const extra = plan?.extra ?? 0;
  const pd = list.map((d) => ({ id: d.id, name: d.name, balance: d.balance, rate: d.rate, minPay: d.monthlyPay }));
  const r = simulatePayoff(pd, extra, strategy);
  const first = list.find((d) => d.id === r.firstTarget) ?? null;
  const at = (m: number | null) => (m == null ? null : new Date(now.getFullYear(), now.getMonth() + m, 1));

  // progress since the plan started: only debts that existed then (new debts don't hide progress)
  const byId = new Map(list.map((d) => [d.id, d]));
  const start = plan?.startDebts ?? [];
  const paidOff = start.reduce((a, s) => a + Math.max(0, s.balance - (byId.get(s.id)?.balance ?? 0)), 0);
  const startTotal = plan?.startTotal ?? 0;
  const cleared = start.filter((s) => !byId.has(s.id));
  const newCleared = cleared.filter((c) => !(plan?.seenCleared ?? []).includes(c.id));

  // this month's check: from pay day, if there's an extra amount and no answer yet
  const cyc = cycleBounds(now, p.cycleStartDay ?? 1);
  const cycleKey = ym(cyc.start);
  const answered = plan?.log?.[cycleKey];
  const askNow = extra > 0 && !!first && !answered;
  // streak of months the extra went in
  const keys = Object.keys(plan?.log ?? {}).sort().reverse();
  let streak = 0;
  for (const k of keys) {
    if (plan!.log![k] !== 'paid') break;
    streak++;
  }
  // what skipping this month costs
  const skip = extra > 0 ? simulatePayoff(pd, extra, strategy, 2) : null;
  const skipCost = skip && r.months != null && skip.months != null ? { months: skip.months - r.months, interest: skip.interest - r.interest } : null;

  return {
    list, totals: debtTotals(list), first, extra, strategy,
    months: r.months, freeBy: at(r.months), stuck: r.stuck,
    started: plan?.startedAt ? new Date(plan.startedAt) : null,
    startTotal, paidOff, pct: startTotal > 0 ? Math.min(1, paidOff / startTotal) : 0,
    cleared, newCleared,
    cycleKey, answered, askNow, streak, skipCost,
  };
}
export type DebtPlanSummary = NonNullable<ReturnType<typeof debtPlanSummary>>;

// A fresh starting point for progress (when the plan is first set, or restarted)
export const planStart = (list: DebtLine[], now = new Date()) => ({
  startedAt: now.toISOString(),
  startTotal: list.reduce((a, d) => a + d.balance, 0),
  startDebts: list.map((d) => ({ id: d.id, name: d.name, balance: d.balance })),
});

// Pay day 10 AM: "Put ₹5,000 extra on SBI Card"; 3 days later: "Did you pay the extra?" (only if unanswered)
export function debtPlanReminders(s: DebtPlanSummary | null, cycleStartDay = 1, now = new Date()): MoneyReminder[] {
  if (!s?.first || s.extra <= 0 || !s.list.length) return [];
  const cyc = cycleBounds(now, cycleStartDay);
  const payday = new Date(cyc.start.getFullYear(), cyc.start.getMonth(), cyc.start.getDate(), 10);
  const nextPayday = new Date(cyc.end.getFullYear(), cyc.end.getMonth(), cyc.end.getDate(), 10);
  const freeBy = s.freeBy ? ` · debt-free by ${monthYear(s.freeBy)}` : '';
  const put = { iouId: '', href: '/debts', title: `Put ${formatINR(s.extra)} extra on ${s.first.name}`, body: `Your payoff plan: pay this first${freeBy}` };
  const ask = { iouId: '', href: '/', title: `Did you pay the extra ${formatINR(s.extra)} to ${s.first.name}?`, body: 'Tap Yes or Not this month on Home — it keeps your plan on track' };
  const out: MoneyReminder[] = [
    { ...put, id: `debtplan:${ym(nextPayday)}:put`, when: nextPayday, urgency: 'later' },
    { ...ask, id: `debtplan:${ym(nextPayday)}:ask`, when: new Date(nextPayday.getTime() + 3 * DAY), urgency: 'later' },
  ];
  if (!s.answered) {
    const since = (now.getTime() - payday.getTime()) / DAY;
    if (since >= 0 && since < 3) out.push({ ...put, id: `debtplan:${s.cycleKey}:put`, when: payday, urgency: 'today' });
    const askAt = new Date(payday.getTime() + 3 * DAY);
    if (askAt > now) out.push({ ...ask, id: `debtplan:${s.cycleKey}:ask`, when: askAt, urgency: 'later' });
  }
  return out;
}

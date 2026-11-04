// The saved payoff plan, ready for Home and reminders:
// "Debt-free by Aug 2028 · Pay this first: SBI Card (+₹5,000 this month)"
import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import type { MoneyReminder } from './debtReminders';
import type { AccountBalance } from './accounts';
import { allDebts, debtTotals } from './allDebts';
import { formatINR } from './format';
import { simulatePayoff, type Strategy } from './payoff';

export function debtPlanSummary(p: { ious: Iou[]; bills: Bill[]; accounts: AccountBalance[]; plan?: { strategy: Strategy; extra: number } }) {
  const list = allDebts({ ious: p.ious, bills: p.bills, accounts: p.accounts });
  if (!list.length) return null;
  const strategy = p.plan?.strategy ?? 'avalanche';
  const extra = p.plan?.extra ?? 0;
  const r = simulatePayoff(list.map((d) => ({ id: d.id, name: d.name, balance: d.balance, rate: d.rate, minPay: d.monthlyPay })), extra, strategy);
  const first = list.find((d) => d.id === r.firstTarget) ?? null;
  const freeBy = r.months == null ? null : new Date(new Date().getFullYear(), new Date().getMonth() + r.months, 1);
  return { list, totals: debtTotals(list), first, extra, freeBy, months: r.months, stuck: r.stuck };
}

// On pay day (your month start), a reminder to send the extra to the "pay this first" debt
export function debtPlanReminders(s: ReturnType<typeof debtPlanSummary>, cycleStartDay = 1, now = new Date()): MoneyReminder[] {
  if (!s?.first || s.extra <= 0) return [];
  const day = Math.min(Math.max(1, cycleStartDay), 28);
  const thisPay = new Date(now.getFullYear(), now.getMonth(), day, 10);
  const nextPay = thisPay > now ? thisPay : new Date(now.getFullYear(), now.getMonth() + 1, day, 10);
  const daysSincePay = (now.getTime() - thisPay.getTime()) / 86_400_000;
  const base = { iouId: '', href: '/debts', title: `Put ${formatINR(s.extra)} extra on ${s.first.name}`, body: `Your plan: pay this first${s.freeBy ? ` · debt-free by ${s.freeBy.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}` };
  const out: MoneyReminder[] = [{ ...base, id: `debtplan:${nextPay.toISOString().slice(0, 7)}`, when: nextPay, urgency: 'later' }];
  // show on Home for the first 3 days after pay day
  if (daysSincePay >= 0 && daysSincePay < 3) out.push({ ...base, id: `debtplan:${thisPay.toISOString().slice(0, 7)}:now`, when: thisPay, urgency: 'today' });
  return out;
}

// Subscription radar: the plans you pay for again and again (streaming, apps, recharges, gym),
// from your bills plus repeating payments Corpus spotted that aren't bills yet.
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { frequencyLabel, isFinished, monthlyEquivalent, nextDue, yearlyCost } from './bills';
import { repeatingPayments, type Repeating } from './detect';

const DAY = 86_400_000;
// Fixed costs of living or debt, not something you subscribe to
const NOT_A_PLAN = /\b(rent|emi|loan|electric|electricity|water|gas|maintenance|society|school|tuition|fee|fees|insurance|policy|lic|premium|tax|sip)\b/;

export function isSubscription(b: Bill) {
  return !b.loan && !b.variable && !b.endMonth && !NOT_A_PLAN.test(b.name.toLowerCase());
}

export type Sub = {
  key: string;
  name: string;
  category: string;
  amount: number;          // per payment
  monthly: number;         // per month, on average
  yearly: number;
  freq: string;            // "Every month", "Every 28 days"
  next: Date | null;       // next charge (null when paused)
  daysAway: number | null;
  rise: number | null;     // ₹ more than the time before, if the price went up
  paused: boolean;
  billId?: string;
  found?: Repeating;       // spotted in your spends, not a bill yet
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysTo = (d: Date, now: Date) => Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);

// The last two amounts logged from a bill: a step up of more than 3% is a price rise
function riseOf(b: Bill, tx: Transaction[]): number | null {
  const paid = tx.filter((t) => t.recurringId === b.id).sort((x, y) => (x.date < y.date ? -1 : 1)).map((t) => t.amount);
  const last = paid[paid.length - 1];
  if (last != null && b.amount > last * 1.03) return Math.round(b.amount - last); // the bill was edited up
  if (paid.length < 2) return null;
  const prev = paid[paid.length - 2];
  return last > prev * 1.03 ? Math.round(last - prev) : null;
}

export function subscriptionRadar(bills: Bill[], tx: Transaction[], dismissed: string[], now = new Date()) {
  const fromBills: Sub[] = bills
    .filter((b) => !isFinished(b, now) && isSubscription(b))
    .map((b) => {
      const n = b.active ? nextDue(b, now) : null;
      return {
        key: `bill:${b.id}`, name: b.name, category: b.category, amount: b.amount,
        monthly: Math.round(monthlyEquivalent(b)), yearly: yearlyCost(b), freq: frequencyLabel(b),
        next: n?.date ?? null, daysAway: n?.daysAway ?? null, rise: riseOf(b, tx), paused: !b.active, billId: b.id,
      };
    });
  const found: Sub[] = repeatingPayments(tx, bills, now)
    .filter((r) => !r.variable && !dismissed.includes(r.key) && !NOT_A_PLAN.test(r.name.toLowerCase()))
    .map((r) => {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), Math.min(r.day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()), 9);
      const next = r.paidThisMonth || thisMonth < startOfDay(now) ? new Date(now.getFullYear(), now.getMonth() + 1, r.day, 9) : thisMonth;
      return {
        key: r.key, name: r.name, category: r.category, amount: r.amount, monthly: r.amount, yearly: r.yearly,
        freq: `Every month, ${r.months} in a row`, next, daysAway: daysTo(next, now), rise: r.increase, paused: false, found: r,
      };
    });
  const active = [...fromBills.filter((s) => !s.paused), ...found].sort((a, b) => b.yearly - a.yearly);
  const paused = fromBills.filter((s) => s.paused);
  const monthly = active.reduce((s, x) => s + x.monthly, 0);
  const yearly = active.reduce((s, x) => s + x.yearly, 0);
  // the next 30 days, soonest first (late ones count as today)
  const coming = active.filter((s) => s.daysAway != null && s.daysAway < 30).sort((a, b) => a.daysAway! - b.daysAway!);
  return { active, paused, found, monthly, yearly, coming, rises: active.filter((s) => s.rise) };
}

// Average monthly income over the last 3 months that had any
export function usualIncome(tx: Transaction[], now = new Date()) {
  const m = new Map<string, number>();
  for (const t of tx) {
    if (t.type !== 'income') continue;
    const d = new Date(t.date);
    const back = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (back < 0 || back > 2) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  return m.size ? [...m.values()].reduce((a, b) => a + b, 0) / m.size : 0;
}

// Smart detection — finds patterns in what you've logged, so you don't have to set things up.
// Rule: every finding comes with a one-tap action; nothing shows unless the data really says so.
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { findCategory } from '@/constants/categories';

const DAY = 86_400_000;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
// "Netflix 649!" → "netflix"; "Jio recharge (Nov)" → "jio recharge"
export const noteKey = (n?: string) =>
  (n ?? '').toLowerCase().replace(/[0-9₹,.:;!?()\[\]#/\\-]+/g, ' ').replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

// ─── 1) Repeating payments that aren't bills yet ───
export type Repeating = {
  key: string;            // stable id for dismissing
  name: string;
  category: string;
  amount: number;         // typical amount
  day: number;            // typical day of the month
  months: number;         // how many months it appeared
  variable: boolean;      // amount changes (electricity, recharge with different plans)
  increase: number | null; // last payment − typical (a price rise), if any
  yearly: number;
  paidThisMonth: boolean;
  lastDate: string;
};

export function repeatingPayments(tx: Transaction[], bills: Bill[], now = new Date()): Repeating[] {
  const yearAgo = now.getTime() - 400 * DAY;
  const groups = new Map<string, Transaction[]>();
  for (const t of tx) {
    if (t.type !== 'expense' || t.recurringId || new Date(t.date).getTime() < yearAgo) continue;
    const nk = noteKey(t.note);
    // with a note: group by note (+ category); without one: only an exact repeating amount counts
    const key = nk.length >= 3 ? `n:${nk}|${t.category}` : `a:${Math.round(t.amount)}|${t.category}`;
    const g = groups.get(key) ?? [];
    g.push(t);
    groups.set(key, g);
  }
  const billNames = bills.map((b) => noteKey(b.name));
  const out: Repeating[] = [];
  for (const [key, list] of groups) {
    // one payment per month (if logged twice in a month, keep the bigger one)
    const byMonth = new Map<string, Transaction>();
    for (const t of list) {
      const k = ym(new Date(t.date));
      const cur = byMonth.get(k);
      if (!cur || t.amount > cur.amount) byMonth.set(k, t);
    }
    const ms = [...byMonth.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (ms.length < 3) continue;
    // regular: gaps between months mostly ~1 month, and still happening (seen in the last ~45 days)
    const dates = ms.map((t) => new Date(t.date).getTime());
    const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / DAY);
    const regular = gaps.filter((g) => g >= 20 && g <= 40).length / gaps.length;
    if (regular < 0.7 || now.getTime() - dates[dates.length - 1] > 45 * DAY) continue;
    const amounts = ms.map((t) => t.amount);
    // a price rise is ONE step up that stays (₹499 → ₹649); amounts that keep changing are "variable"
    const changes = amounts.slice(1).filter((a, i) => Math.abs(a - amounts[i]) / amounts[i] > 0.03).length;
    const variable = changes >= 2 && Math.max(...amounts) / Math.max(1, Math.min(...amounts)) > 1.2;
    const stepUp = !variable && changes === 1 && amounts[amounts.length - 1] > amounts[0] * 1.03;
    const typical = Math.round(variable ? median(amounts) : amounts[amounts.length - 1]);
    const isNoted = key.startsWith('n:');
    if (!isNoted && changes > 0) continue; // same-amount groups must be exact
    if (variable && ms[0].category !== 'bills') continue; // changing amounts only make sense for utility bills
    if (list.length > ms.length * 1.5) continue; // several times a month (food delivery, fuel) isn't a bill
    const name = isNoted ? title(noteKey(ms[ms.length - 1].note)) : `${findCategory('expense', ms[0].category)?.label ?? 'Payment'} ₹${typical}`;
    // already a bill? (same name, or same amount & category)
    if (billNames.some((b) => b && (b === noteKey(name) || b.includes(noteKey(name)) || noteKey(name).includes(b)))) continue;
    if (bills.some((b) => b.category === ms[0].category && Math.abs(b.amount - typical) / typical < 0.05)) continue;
    out.push({
      key: `rep:${key}`,
      name,
      category: ms[0].category,
      amount: typical,
      day: Math.round(median(ms.map((t) => new Date(t.date).getDate()))),
      months: ms.length,
      variable,
      increase: stepUp ? Math.round(amounts[amounts.length - 1] - amounts[0]) : null,
      yearly: typical * 12,
      paidThisMonth: byMonth.has(ym(now)),
      lastDate: ms[ms.length - 1].date,
    });
  }
  return out.sort((a, b) => b.yearly - a.yearly);
}

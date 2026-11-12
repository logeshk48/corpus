// Monthly report — the month that just ended, compared with the one before.
import { findCategory } from '@/constants/categories';
import type { Investment } from '@/types/investment';
import type { Transaction } from '@/types/transaction';
import { formatINR } from './format';

export const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const lastMonthKey = (now = new Date()) => monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
const prevKey = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return monthKeyOf(new Date(y, m - 2, 1));
};
export const monthName = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' });

export function monthReport(p: {
  tx: Transaction[]; investments: Investment[]; month: string; budget?: number;
  netWorth?: Record<string, { total: number }>; scoreLog?: Record<string, number>;
}) {
  const sum = (k: string) => {
    let income = 0, spent = 0, bills = 0;
    const cats = new Map<string, number>();
    const days = new Set<string>();
    for (const t of p.tx) {
      if (monthKeyOf(new Date(t.date)) !== k) continue;
      days.add(new Date(t.date).toDateString());
      if (t.type === 'income') income += t.amount;
      else {
        spent += t.amount;
        if (t.recurringId) bills += t.amount;
        cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
      }
    }
    return { income, spent, bills, cats, days: days.size };
  };
  const cur = sum(p.month), prev = sum(prevKey(p.month));
  const invested = p.investments.reduce((a, h) => a + (h.sipLog ?? []).filter((l) => l.status === 'done' && l.month === p.month).reduce((s, l) => s + l.amount, 0), 0);
  const top = [...cur.cats.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPrev = top ? prev.cats.get(top[0]) ?? 0 : 0;
  // the category that grew the most vs the month before
  const jump = [...cur.cats.entries()].map(([c, v]) => ({ c, d: v - (prev.cats.get(c) ?? 0) })).sort((a, b) => b.d - a.d)[0];
  const [y, m] = p.month.split('-').map(Number);
  const daysIn = new Date(y, m, 0).getDate();
  const nwNow = p.netWorth?.[p.month]?.total, nwPrev = p.netWorth?.[prevKey(p.month)]?.total;
  const sc = p.scoreLog?.[p.month], scPrev = p.scoreLog?.[prevKey(p.month)];
  return {
    month: p.month, name: monthName(p.month),
    income: cur.income, spent: cur.spent, saved: cur.income - cur.spent, rate: cur.income ? (cur.income - cur.spent) / cur.income : null,
    spentChange: prev.spent ? (cur.spent - prev.spent) / prev.spent : null, prevSpent: prev.spent,
    budget: p.budget ?? null, overBudget: p.budget ? cur.spent - p.budget : null,
    top: top ? { label: findCategory('expense', top[0])?.label ?? top[0], amount: top[1], prev: topPrev } : null,
    jump: jump && jump.d > 500 ? { label: findCategory('expense', jump.c)?.label ?? jump.c, by: jump.d } : null,
    bills: cur.bills, invested, loggedDays: cur.days, daysIn,
    netWorthChange: nwNow != null && nwPrev != null ? nwNow - nwPrev : null,
    score: sc ?? null, scoreChange: sc != null && scPrev != null ? sc - scPrev : null,
    hasData: cur.income + cur.spent > 0,
  };
}
export type MonthReport = ReturnType<typeof monthReport>;

export function monthSummaryText(r: MonthReport) {
  const parts: string[] = [];
  if (r.income) parts.push(`saved ${formatINR(Math.round(r.saved))}${r.rate != null ? ` (${Math.round(r.rate * 100)}%)` : ''}`);
  parts.push(`spent ${formatINR(Math.round(r.spent))}${r.spentChange != null && Math.abs(r.spentChange) >= 0.05 ? ` (${r.spentChange > 0 ? '+' : '−'}${Math.round(Math.abs(r.spentChange) * 100)}%)` : ''}`);
  if (r.overBudget != null) parts.push(r.overBudget > 0 ? `${formatINR(Math.round(r.overBudget))} over budget` : 'within budget ✓');
  if (r.top) parts.push(`top: ${r.top.label}`);
  return `${r.name}: ${parts.join(' · ')}`;
}

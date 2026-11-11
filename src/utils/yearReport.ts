// Year in review — calendar year (Jan–Dec) or Indian financial year (Apr–Mar).
// Uses the same rules as the rest of the app: income − spending = saved; SIPs counted as invested.
import { findCategory } from '@/constants/categories';
import type { Investment } from '@/types/investment';
import type { Transaction } from '@/types/transaction';

export type YearKind = 'calendar' | 'fy';
export const yearRange = (kind: YearKind, year: number) =>
  kind === 'calendar' ? { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) } : { start: new Date(year, 3, 1), end: new Date(year + 1, 3, 1) };
export const yearLabel = (kind: YearKind, year: number) => (kind === 'calendar' ? String(year) : `FY ${year}-${String((year + 1) % 100).padStart(2, '0')}`);
// the year you're in now
export const currentYear = (kind: YearKind, now = new Date()) => (kind === 'calendar' ? now.getFullYear() : now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);

export type MonthRow = { key: string; label: string; income: number; spent: number; saved: number; rate: number | null; invested: number; future: boolean };

export function yearReport(tx: Transaction[], investments: Investment[], kind: YearKind, year: number, now = new Date()) {
  const { start, end } = yearRange(kind, year);
  const inYear = tx.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d < end;
  });
  const months: MonthRow[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      income: 0, spent: 0, saved: 0, rate: null, invested: 0, future: d > now,
    });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));
  const mk = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const cats = new Map<string, number>();
  let billsPaid = 0;
  for (const t of inYear) {
    const m = months[idx.get(mk(t.date))!];
    if (!m) continue;
    if (t.type === 'income') m.income += t.amount;
    else {
      m.spent += t.amount;
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
      if (t.recurringId) billsPaid += t.amount;
    }
  }
  // money that went into investments in the year: SIPs + other purchases (lots)
  for (const h of investments)
    for (const l of h.lots ?? []) {
      const i = idx.get(mk(l.date));
      if (i != null) months[i].invested += l.units * l.price;
    }
  for (const m of months) {
    m.saved = m.income - m.spent;
    m.rate = m.income > 0 ? m.saved / m.income : null;
  }
  const income = months.reduce((a, m) => a + m.income, 0);
  const spent = months.reduce((a, m) => a + m.spent, 0);
  const invested = months.reduce((a, m) => a + m.invested, 0);
  const withIncome = months.filter((m) => m.rate != null && !m.future);
  const best = withIncome.length ? withIncome.reduce((b, m) => (m.rate! > b.rate! ? m : b)) : null;
  const worst = withIncome.length ? withIncome.reduce((b, m) => (m.rate! < b.rate! ? m : b)) : null;
  const active = months.filter((m) => !m.future && (m.income || m.spent)).length;
  const categories = [...cats.entries()]
    .map(([id, amount]) => ({ id, label: findCategory('expense', id)?.label ?? id, amount, share: spent ? amount / spent : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const biggest = inYear.filter((t) => t.type === 'expense' && !t.recurringId).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const loggedDays = new Set(inYear.map((t) => new Date(t.date).toDateString())).size;
  return {
    start, end, months, income, spent, saved: income - spent, rate: income ? (income - spent) / income : null,
    invested, billsPaid, categories, biggest, best, worst, activeMonths: active,
    avgSpend: active ? spent / active : 0, loggedDays, count: inYear.length,
  };
}

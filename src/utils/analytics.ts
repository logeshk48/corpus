import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';

export const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const shiftMonth = (key: string, n: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1 + n, 1);
  return ym(d);
};
export const monthLabel = (key: string, style: 'long' | 'short' = 'long') =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString('en-IN', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
  });
export const daysIn = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5)), 0).getDate();

const inMonth = (t: Transaction, key: string) => ym(new Date(t.date)) === key;

// ── Month totals ────────────────────────────────────────────
export type MonthTotals = { income: number; spent: number; saved: number; savingsRate: number | null };

// `upToDay` limits the month to days 1..upToDay (fair comparison with an in-progress month)
export function monthTotals(tx: Transaction[], key: string, upToDay?: number): MonthTotals {
  let income = 0;
  let spent = 0;
  for (const t of tx) {
    if (!inMonth(t, key)) continue;
    if (upToDay !== undefined && new Date(t.date).getDate() > upToDay) continue;
    if (t.type === 'income') income += t.amount;
    else spent += t.amount;
  }
  const saved = income - spent;
  return { income, spent, saved, savingsRate: income > 0 ? Math.round((saved / income) * 100) : null };
}

// % change vs a previous value (null when there's nothing to compare)
export function change(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

// ── Spending by category (sorted, biggest first) ────────────
export type CategoryShare = { id: string; label: string; icon: string; amount: number; share: number; count: number };

export function byCategory(tx: Transaction[], key: string): CategoryShare[] {
  const map = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of tx) {
    if (t.type !== 'expense' || !inMonth(t, key)) continue;
    const e = map.get(t.category) ?? { amount: 0, count: 0 };
    e.amount += t.amount;
    e.count += 1;
    map.set(t.category, e);
    total += t.amount;
  }
  return [...map.entries()]
    .map(([id, e]) => {
      const cat = findCategory('expense', id);
      return {
        id,
        label: cat?.label ?? 'Other',
        icon: cat?.icon ?? 'ellipsis-horizontal',
        amount: e.amount,
        count: e.count,
        share: total > 0 ? Math.round((e.amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// ── Daily spending for a month ──────────────────────────────
export type DayPoint = { day: number; amount: number; future: boolean };

export function dailySpending(tx: Transaction[], key: string, now: Date = new Date()): DayPoint[] {
  const days = daysIn(key);
  const totals = new Array(days).fill(0);
  for (const t of tx) {
    if (t.type !== 'expense' || !inMonth(t, key)) continue;
    totals[new Date(t.date).getDate() - 1] += t.amount;
  }
  const isCurrent = key === ym(now);
  return totals.map((amount, i) => ({ day: i + 1, amount, future: isCurrent && i + 1 > now.getDate() }));
}

// Average per day, over the days that have passed in that month
export function dailyAverage(points: DayPoint[]): number {
  const past = points.filter((p) => !p.future);
  if (past.length === 0) return 0;
  return past.reduce((s, p) => s + p.amount, 0) / past.length;
}

// ── Last N months: income vs spending ──────────────────────
export type MonthPoint = { key: string; income: number; spent: number };

export function monthlyTrend(tx: Transaction[], endKey: string, count = 6): MonthPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonth(endKey, i - (count - 1));
    const t = monthTotals(tx, key);
    return { key, income: t.income, spent: t.spent };
  });
}

// ── Plain-language insights ─────────────────────────────────
export function insights(tx: Transaction[], key: string, now: Date = new Date()): string[] {
  const out: string[] = [];
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const cats = byCategory(tx, key);
  const current = monthTotals(tx, key);
  // In-progress month → compare with the SAME days of last month
  const isCurrent = key === ym(now);
  const previous = monthTotals(tx, shiftMonth(key, -1), isCurrent ? now.getDate() : undefined);

  if (cats.length === 1) {
    out.push(`All your spending was on ${cats[0].label} — ${fmt(cats[0].amount)}.`);
  } else if (cats.length > 1) {
    out.push(`${cats[0].label} was your biggest spend — ${fmt(cats[0].amount)}, ${cats[0].share}% of the month.`);
  }

  const days = dailySpending(tx, key, now).filter((d) => !d.future);
  const top = days.reduce<DayPoint | null>((best, d) => (d.amount > (best?.amount ?? 0) ? d : best), null);
  if (top && top.amount > 0) {
    const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, top.day);
    out.push(
      `Your biggest day was ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} — ${fmt(top.amount)}.`
    );
  }

  // Weekend vs weekday average
  let we = 0, weN = 0, wd = 0, wdN = 0;
  for (const d of days) {
    const dow = new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, d.day).getDay();
    if (dow === 0 || dow === 6) { we += d.amount; weN++; } else { wd += d.amount; wdN++; }
  }
  if (weN > 0 && wdN > 0 && we + wd > 0) {
    const weAvg = we / weN;
    const wdAvg = wd / wdN;
    if (wdAvg === 0 && weAvg > 0) {
      out.push(`All your spending so far happened on weekends — about ${fmt(weAvg)} per weekend day.`);
    } else if (wdAvg > 0 && weAvg > wdAvg * 1.25) {
      const ratio = weAvg / wdAvg;
      out.push(
        ratio >= 5
          ? `Weekends cost you far more — ${fmt(weAvg)} a day vs ${fmt(wdAvg)} on weekdays.`
          : `You spend ${ratio.toFixed(1)}× more per day on weekends (${fmt(weAvg)} vs ${fmt(wdAvg)}).`
      );
    } else if (weAvg > 0 && wdAvg > weAvg * 1.25) {
      out.push(`Weekdays cost you more than weekends — ${fmt(wdAvg)} vs ${fmt(weAvg)} a day.`);
    }
  }

  const c = change(current.spent, previous.spent);
  if (c !== null && Math.abs(c) >= 5) {
    out.push(
      isCurrent
        ? c > 0
          ? `So far you've spent ${c}% more than by this point in ${monthLabel(shiftMonth(key, -1), 'short')}.`
          : `So far you've spent ${-c}% less than by this point in ${monthLabel(shiftMonth(key, -1), 'short')} — nice.`
        : c > 0
        ? `Spending was up ${c}% on ${monthLabel(shiftMonth(key, -1), 'short')}.`
        : `Spending was down ${-c}% on ${monthLabel(shiftMonth(key, -1), 'short')} — nice.`
    );
  }

  if (current.savingsRate !== null) {
    out.push(
      current.savingsRate >= 20
        ? `You kept ${current.savingsRate}% of your income — above the common 20% savings guideline.`
        : current.savingsRate >= 0
        ? `You kept ${current.savingsRate}% of your income. A common guideline is 20%.`
        : `You spent ${fmt(-current.saved)} more than you earned this month.`
    );
  }
  return out;
}

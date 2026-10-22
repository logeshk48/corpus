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

// ══ Analytics v2 ═════════════════════════════════════════════

// Spending per category for one month, optionally only days 1..upToDay
export function categoryTotals(tx: Transaction[], key: string, upToDay?: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tx) {
    if (t.type !== 'expense' || !inMonth(t, key)) continue;
    if (upToDay !== undefined && new Date(t.date).getDate() > upToDay) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return map;
}

// One category across the last `count` months (ending at endKey)
export function categoryTrend(tx: Transaction[], categoryId: string, endKey: string, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonth(endKey, i - (count - 1));
    const amount = tx
      .filter((t) => t.type === 'expense' && t.category === categoryId && inMonth(t, key))
      .reduce((s, t) => s + t.amount, 0);
    return { key, amount };
  });
}

// ── Cash flow: where did this month's income go? ────────────
export type CashFlow = {
  income: number;
  bills: number;   // expenses auto-logged from recurring bills
  other: number;   // every other expense
  jars: number;    // net money moved into jars (in − out)
  left: number;    // income − bills − other − jars (negative = overspent)
};

type JarMove = { type: 'in' | 'out'; amount: number; date: string };

export function cashFlow(tx: Transaction[], jarEntries: JarMove[], key: string): CashFlow {
  let income = 0, bills = 0, other = 0;
  for (const t of tx) {
    if (!inMonth(t, key)) continue;
    if (t.type === 'income') income += t.amount;
    else if (t.recurringId) bills += t.amount;
    else other += t.amount;
  }
  const jars = jarEntries
    .filter((e) => ym(new Date(e.date)) === key)
    .reduce((s, e) => s + (e.type === 'in' ? e.amount : -e.amount), 0);
  return { income, bills, other, jars, left: income - bills - other - jars };
}

// ── Biggest single expenses ─────────────────────────────────
export function topExpenses(tx: Transaction[], key: string, count = 5): Transaction[] {
  return tx
    .filter((t) => t.type === 'expense' && inMonth(t, key))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count);
}

// ── Income by source (income stream) ───────────────────────
export type SourceShare = { id: string; name: string; amount: number; share: number };

export function incomeBySource(tx: Transaction[], key: string, streams: { id: string; name: string }[]): SourceShare[] {
  const names = new Map(streams.map((s) => [s.id, s.name]));
  const map = new Map<string, number>();
  let total = 0;
  for (const t of tx) {
    if (t.type !== 'income' || !inMonth(t, key)) continue;
    const id = t.streamId && names.has(t.streamId) ? t.streamId : '_other';
    map.set(id, (map.get(id) ?? 0) + t.amount);
    total += t.amount;
  }
  return [...map.entries()]
    .map(([id, amount]) => ({
      id,
      name: id === '_other' ? 'Not linked to a stream' : names.get(id)!,
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => (a.id === '_other' ? 1 : b.id === '_other' ? -1 : b.amount - a.amount));
}

// ── Calendar heatmap: 0..4 intensity per day (sequential) ──
export function heatLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const r = amount / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

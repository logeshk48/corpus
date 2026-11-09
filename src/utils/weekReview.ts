// Weekly review — Monday to Sunday, compared with the week before.
import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';
import { formatINR } from './format';

const DAY = 86_400_000;
export function weekBounds(now = new Date()) {
  const back = (now.getDay() + 6) % 7; // days since Monday
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
  return { start, end: new Date(start.getTime() + 7 * DAY) };
}

export function weekReview(tx: Transaction[], now = new Date()) {
  const { start, end } = weekBounds(now);
  const prevStart = new Date(start.getTime() - 7 * DAY);
  const inRange = (t: Transaction, a: Date, b: Date) => {
    const d = new Date(t.date);
    return d >= a && d < b;
  };
  const week = tx.filter((t) => inRange(t, start, end));
  const prev = tx.filter((t) => inRange(t, prevStart, start));
  const spend = (l: Transaction[]) => l.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const spent = spend(week), before = spend(prev);
  const income = week.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const byCat = new Map<string, number>();
  for (const t of week) if (t.type === 'expense') byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  const biggest = week.filter((t) => t.type === 'expense' && !t.recurringId).sort((a, b) => b.amount - a.amount)[0] ?? null;
  // days this week so far (up to today) with at least one entry, and days with no spending
  const daysSoFar = Math.min(7, Math.floor((Math.min(now.getTime(), end.getTime() - 1) - start.getTime()) / DAY) + 1);
  const dayKey = (t: Transaction) => new Date(t.date).toDateString();
  const loggedDays = new Set(week.map(dayKey)).size;
  const spendDays = new Set(week.filter((t) => t.type === 'expense').map(dayKey)).size;
  const change = before > 0 ? (spent - before) / before : null;
  return {
    start, end, spent: Math.round(spent), before: Math.round(before), income: Math.round(income), change,
    top: top ? { category: top[0], label: findCategory('expense', top[0])?.label ?? top[0], amount: Math.round(top[1]), share: spent ? top[1] / spent : 0 } : null,
    biggest, daysSoFar, loggedDays, noSpendDays: Math.max(0, daysSoFar - spendDays), count: week.length,
  };
}

export function weekSummaryText(r: ReturnType<typeof weekReview>) {
  const parts = [`Spent ${formatINR(r.spent)}`];
  if (r.change != null && Math.abs(r.change) >= 0.05) parts[0] += ` (${r.change > 0 ? '+' : '−'}${Math.round(Math.abs(r.change) * 100)}% vs last week)`;
  if (r.top) parts.push(`top: ${r.top.label} ${formatINR(r.top.amount)}`);
  if (r.noSpendDays) parts.push(`${r.noSpendDays} no-spend day${r.noSpendDays > 1 ? 's' : ''}`);
  parts.push(`${r.loggedDays}/${r.daysSoFar} days logged`);
  return parts.join(' · ');
}

// Every day of the last year as one cell, for the year heatmap.
// "Good days" compares each day with a daily budget (monthly budget split over the month's days,
// or your usual spend day when there is no budget). "Spending" ranks days by how much went out.
import type { Transaction } from '@/types/transaction';

export type DayCell = {
  key: string; date: Date; spent: number; count: number;
  good: number;   // 0 over budget, 1 to 4 under (4 means nothing spent)
  spend: number;  // 0 nothing, 1 to 4 by size
  ref: number;    // the daily budget used for this day
  state: 'day' | 'before' | 'future';
};
export type YearDays = {
  weeks: DayCell[][];                     // columns, Monday first
  months: { col: number; label: string }[];
  goodDays: number; tracked: number; noSpend: number;
  run: number; best: number;              // days in a row at or under the daily budget
  hasBudget: boolean;
};

const dkey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const daysIn = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

export function yearDays(tx: Transaction[], budget?: number, weeks = 53, now = new Date()): YearDays {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7); // Monday, weeks ago

  const byDay = new Map<string, { spent: number; count: number }>();
  let first: Date | null = null;
  for (const t of tx) {
    const d = new Date(t.date);
    if (!first || d < first) first = d;
    if (t.type !== 'expense') continue;
    const k = dkey(d);
    const e = byDay.get(k) ?? { spent: 0, count: 0 };
    e.spent += t.amount; e.count += 1;
    byDay.set(k, e);
  }
  const firstDay = first ? new Date(first.getFullYear(), first.getMonth(), first.getDate()) : today;
  const amounts = [...byDay.values()].map((e) => e.spent).sort((a, b) => a - b);
  const q = (p: number) => amounts[Math.min(amounts.length - 1, Math.floor(p * amounts.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const usual = q2 || 1;

  const cols: DayCell[][] = [];
  const months: { col: number; label: string }[] = [];
  let goodDays = 0, tracked = 0, noSpend = 0, run = 0, best = 0, cur = 0;
  for (let c = 0; c < weeks; c++) {
    const col: DayCell[] = [];
    for (let r = 0; r < 7; r++) {
      const date = new Date(start);
      date.setDate(start.getDate() + c * 7 + r);
      if (date.getDate() <= 7 && r === 0 && (c > 0 || date.getDate() === 1)) months.push({ col: c, label: date.toLocaleDateString('en-IN', { month: 'short' }) });
      const e = byDay.get(dkey(date)) ?? { spent: 0, count: 0 };
      const ref = budget ? budget / daysIn(date) : usual;
      const state: DayCell['state'] = date > today ? 'future' : date < firstDay ? 'before' : 'day';
      const good = e.spent === 0 ? 4 : e.spent <= ref / 3 ? 3 : e.spent <= (2 * ref) / 3 ? 2 : e.spent <= ref ? 1 : 0;
      const spend = e.spent === 0 ? 0 : e.spent <= q1 ? 1 : e.spent <= q2 ? 2 : e.spent <= q3 ? 3 : 4;
      if (state === 'day') {
        tracked += 1;
        if (good > 0) { goodDays += 1; cur += 1; best = Math.max(best, cur); } else cur = 0;
        if (e.spent === 0) noSpend += 1;
      }
      col.push({ key: dkey(date), date, spent: e.spent, count: e.count, good, spend, ref, state });
    }
    cols.push(col);
  }
  run = cur;
  return { weeks: cols, months, goodDays, tracked, noSpend, run, best, hasBudget: !!budget };
}

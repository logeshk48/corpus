import type { Account } from '@/types/account';
import type { Transaction } from '@/types/transaction';

const DAY = 86_400_000;

// Your usual salary day, from income in the last ~4 months (salary category/stream first)
export function detectPayday(tx: Transaction[], now = new Date()) {
  const from = now.getTime() - 125 * DAY;
  const inc = tx.filter((t) => t.type === 'income' && new Date(t.date).getTime() > from);
  const salary = inc.filter((t) => t.category === 'salary');
  const pool = salary.length >= 1 ? salary : inc.filter((t) => t.amount >= Math.max(...inc.map((x) => x.amount)) * 0.5);
  if (pool.length === 0) return null;
  // cluster days of month within ±2 (salary on 30th/1st counts as the same)
  // newest first, so ties go to your most recent pay day
  const days = [...pool].sort((a, b) => b.date.localeCompare(a.date)).map((t) => new Date(t.date).getDate());
  let best = days[0], bestN = 0;
  for (const d of days) {
    const n = days.filter((x) => Math.min(Math.abs(x - d), 31 - Math.abs(x - d)) <= 2).length;
    if (n > bestN) [best, bestN] = [d, n];
  }
  let next = new Date(now.getFullYear(), now.getMonth(), Math.min(best, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // already paid this cycle? (an income near this day in the last 10 days) → next month
  const paidRecently = pool.some((t) => now.getTime() - new Date(t.date).getTime() < 10 * DAY);
  if (next < today || (paidRecently && next.getTime() - today.getTime() < 10 * DAY)) {
    next = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(best, new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate()));
  }
  const daysLeft = Math.max(1, Math.round((next.getTime() - today.getTime()) / DAY));
  return { day: best, next, daysLeft, confident: bestN >= 2 };
}

// "₹510 must last 5 days → ₹102/day"
export function untilPayday(free: number, perDay: number, payday: { daysLeft: number } | null) {
  if (!payday) return null;
  const allowance = Math.floor(Math.max(0, free) / payday.daysLeft);
  return { allowance, fits: perDay <= allowance, gap: Math.max(0, Math.round(perDay * payday.daysLeft - free)) };
}

export function minBalanceRisk(a: Account & { balance: number }) {
  if (a.type === 'credit' || !a.minBalance) return null;
  const room = a.balance - a.minBalance;
  return { room, below: room < 0, close: room >= 0 && room < a.minBalance * 0.15 };
}

// Extra yearly interest if idle money moved from savings (~3%) to an FD (~7%) — an estimate
export const idleEarnings = (idle: number, savingsRate = 3, fdRate = 7) => Math.round((idle * (fdRate - savingsRate)) / 100);

// Card float: buying the day after the statement gives the longest interest-free period
export function bestSwipeDay(a: Account) {
  if (a.type !== 'credit' || !a.statementDay || !a.dueDay) return null;
  const gap = a.dueDay > a.statementDay ? a.dueDay - a.statementDay : 30 - a.statementDay + a.dueDay; // statement → due
  const best = (a.statementDay % 31) + 1;
  return { best, maxFreeDays: 30 + gap, worstFreeDays: gap + 1 };
}

// Top categories between two dates
export function spendBetween(tx: Transaction[], fromIso: string, toIso: string, top = 3) {
  const a = new Date(fromIso).getTime(), b = new Date(toIso).getTime();
  const map = new Map<string, number>();
  for (const t of tx) {
    const w = new Date(t.date).getTime();
    if (t.type !== 'expense' || w <= a || w > b) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, top).map(([category, amount]) => ({ category, amount }));
}

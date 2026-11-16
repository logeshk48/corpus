import type { IncomeStream } from '@/types/incomeStream';
import type { Transaction } from '@/types/transaction';

// ─── Income that changes every month ───
// Nobody should have to guess a number. From the payments you log, work out what a usual month looks like
// for a source: its range, its average, and roughly which day it pays.

export type Usual = {
  months: number;      // how many of the last 6 full months had a payment
  low: number; high: number; avg: number;
  payDay: number | null;  // usual day of the month it has arrived by
  last: number | null;    // the most recent single payment
};

const mKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export function usualOf(payments: Transaction[], now = new Date()): Usual {
  const cur = mKey(now);
  const byMonth = new Map<number, number>();
  const firstDay = new Map<number, number>();
  for (const p of payments) {
    const d = new Date(p.date);
    const k = mKey(d);
    if (k >= cur || k < cur - 6) continue; // the last 6 full months
    byMonth.set(k, (byMonth.get(k) ?? 0) + p.amount);
    firstDay.set(k, Math.min(firstDay.get(k) ?? 31, d.getDate()));
  }
  const totals = [...byMonth.values()];
  const days = [...firstDay.values()].sort((a, b) => a - b);
  const latest = [...payments].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    months: totals.length,
    low: totals.length ? Math.min(...totals) : 0,
    high: totals.length ? Math.max(...totals) : 0,
    avg: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
    // needs 2+ months to call it a habit; take the later of the usual days so the nudge isn't early
    payDay: days.length >= 2 ? days[Math.ceil(days.length / 2)] ?? days[days.length - 1] : null,
    last: latest ? latest.amount : null,
  };
}

// What to plan with for a month: fixed → the set amount; varying → what the months usually bring
export function usualMonth(s: IncomeStream, u: Usual) {
  if (s.fixed && s.expectedMonthly) return s.expectedMonthly;
  if (u.months >= 2) return u.avg;
  return s.expectedMonthly ?? (u.months === 1 ? u.avg : 0);
}

export type StreamState =
  | { kind: 'fixedDone' } | { kind: 'fixedLeft'; left: number }
  | { kind: 'late'; payDay: number }       // usually here by now, nothing logged
  | { kind: 'waiting' }                    // nothing yet this month, not late
  | { kind: 'low' | 'high' | 'usual' }     // something came in; compared with the usual range
  | { kind: 'new' };                       // not enough history to compare

export function streamState(s: IncomeStream, received: number, u: Usual, now = new Date()): StreamState {
  if (s.fixed && s.expectedMonthly) return received >= s.expectedMonthly ? { kind: 'fixedDone' } : { kind: 'fixedLeft', left: s.expectedMonthly - received };
  if (received <= 0) return u.payDay && now.getDate() > u.payDay ? { kind: 'late', payDay: u.payDay } : { kind: 'waiting' };
  if (u.months < 2) return { kind: 'new' };
  if (received < u.low * 0.9) return { kind: 'low' };
  if (received > u.high * 1.1) return { kind: 'high' };
  return { kind: 'usual' };
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

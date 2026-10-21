import type { Bill } from '@/types/bill';

export const yearMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthStart = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1);

// The bill's due date in a given month (day 31 → last day of short months), at 9 am
export function dueDateIn(bill: Bill, year: number, month: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(bill.dayOfMonth, daysInMonth), 9, 0);
}

// ── Frequency ─────────────────────────────────────────────

const PER_YEAR = { monthly: 12, quarterly: 4, yearly: 1 } as const;

// Is the bill due at all in this calendar month? (month is 0-based)
export function isDueInMonth(bill: Bill, year: number, month: number): boolean {
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (ym < bill.startMonth) return false;
  if (bill.endMonth && ym > bill.endMonth) return false; // after the last payment
  const freq = bill.frequency ?? 'monthly';
  if (freq === 'monthly') return true;
  const anchor = (bill.dueMonth ?? 1) - 1; // 0-based
  if (freq === 'yearly') return month === anchor;
  return (((month - anchor) % 3) + 3) % 3 === 0; // quarterly
}

// What this bill costs per month / per year, on average
export const monthlyEquivalent = (b: Bill) => (b.amount * PER_YEAR[b.frequency ?? 'monthly']) / 12;
export const yearlyCost = (b: Bill) => b.amount * PER_YEAR[b.frequency ?? 'monthly'];

export function frequencyLabel(b: Bill): string {
  const freq = b.frequency ?? 'monthly';
  if (freq === 'monthly') return 'Every month';
  const m = (n: number) => new Date(2000, n - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  const a = b.dueMonth ?? 1;
  if (freq === 'yearly') return `Every year in ${m(a)}`;
  return `Every 3 months (${[0, 3, 6, 9].map((k) => m(((a - 1 + k) % 12) + 1)).join(', ')})`;
}

// ── End date (loans / EMIs) ──────────────────────────────

// All payments done: past the end month, or the last month is already paid
export function isFinished(bill: Bill, now: Date = new Date()): boolean {
  if (!bill.endMonth) return false;
  const ym = yearMonth(now);
  return ym > bill.endMonth || (ym === bill.endMonth && bill.lastLoggedMonth === ym);
}

// How many payments are still to come (including this month's if unpaid)
export function remainingPayments(bill: Bill, now: Date = new Date()): number | null {
  if (!bill.endMonth) return null;
  if (isFinished(bill, now)) return 0;
  let count = 0;
  for (let k = 0; k < 600; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const ym = yearMonth(d);
    if (ym > bill.endMonth) break;
    if (k === 0 && bill.lastLoggedMonth === ym) continue; // this month already paid
    if (isDueInMonth(bill, d.getFullYear(), d.getMonth())) count++;
  }
  return count;
}

export function endLabel(bill: Bill): string | null {
  if (!bill.endMonth) return null;
  const d = new Date(Number(bill.endMonth.slice(0, 4)), Number(bill.endMonth.slice(5)) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ── This month ─────────────────────────────────────────────

export function isPaidThisMonth(bill: Bill, now: Date = new Date()): boolean {
  return bill.lastLoggedMonth === yearMonth(now);
}
export function isSkippedThisMonth(bill: Bill, now: Date = new Date()): boolean {
  return bill.lastSkippedMonth === yearMonth(now) && isPaidThisMonth(bill, now);
}

// Active and actually due this month (frequency + start month respected)
export function dueThisMonth(bill: Bill, now: Date = new Date()): boolean {
  return bill.active && isDueInMonth(bill, now.getFullYear(), now.getMonth());
}

const dueDateReached = (bill: Bill, now: Date) =>
  startOfDay(now) >= startOfDay(dueDateIn(bill, now.getFullYear(), now.getMonth()));

// Fixed-amount bill whose day has come and isn't recorded → auto-log it
export function isDueToLog(bill: Bill, now: Date = new Date()): boolean {
  return !bill.variable && dueThisMonth(bill, now) && !isPaidThisMonth(bill, now) && dueDateReached(bill, now);
}

// Variable bill whose day has come → ask the user for this month's amount
export function needsAmount(bill: Bill, now: Date = new Date()): boolean {
  return !!bill.variable && dueThisMonth(bill, now) && !isPaidThisMonth(bill, now) && dueDateReached(bill, now);
}

// Still-unpaid bills this month → Safe-to-Spend keeps this aside (variable = its usual amount)
export function unpaidThisMonth(bills: Bill[], now: Date = new Date()): number {
  return bills
    .filter((b) => dueThisMonth(b, now) && !isPaidThisMonth(b, now))
    .reduce((sum, b) => sum + b.amount, 0);
}

// ── Next due date ─────────────────────────────────────────

export function nextDue(bill: Bill, now: Date = new Date()) {
  const today = startOfDay(now);
  for (let k = 0; k <= 24; k++) {
    const y = now.getFullYear();
    const m = now.getMonth() + k;
    const d = new Date(y, m, 1);
    if (!isDueInMonth(bill, d.getFullYear(), d.getMonth())) continue;
    const due = dueDateIn(bill, d.getFullYear(), d.getMonth());
    if (k === 0) {
      if (isPaidThisMonth(bill, now)) continue; // done for this month
      // unpaid this month: upcoming (≥ 0 days) or overdue (< 0 days) — either way it's THIS month
    }
    return { date: due, daysAway: Math.round((startOfDay(due).getTime() - today.getTime()) / 86400000) };
  }
  // Fallback (shouldn't happen): start month
  const s = monthStart(bill.startMonth);
  const due = dueDateIn(bill, s.getFullYear(), s.getMonth());
  return { date: due, daysAway: Math.round((startOfDay(due).getTime() - today.getTime()) / 86400000) };
}

// Active bills due within the next `days` days (overdue included), soonest first
export function upcomingBills(bills: Bill[], days = 7, now: Date = new Date()) {
  return bills
    .filter((b) => b.active && !isFinished(b, now))
    .map((b) => ({ bill: b, ...nextDue(b, now) }))
    .filter((x) => x.daysAway <= days)
    .sort((a, b) => a.daysAway - b.daysAway);
}

// ── Totals ────────────────────────────────────────────────

export function monthlyBillsTotal(bills: Bill[]): number {
  return Math.round(bills.filter((b) => b.active && !isFinished(b)).reduce((s, b) => s + monthlyEquivalent(b), 0));
}
export function yearlyBillsTotal(bills: Bill[]): number {
  return bills.filter((b) => b.active && !isFinished(b)).reduce((s, b) => s + yearlyCost(b), 0);
}

// Everything due in the current calendar month (for the calendar + "paid / still to pay")
export function thisMonthBills(bills: Bill[], now: Date = new Date()) {
  return bills
    .filter((b) => dueThisMonth(b, now))
    .map((b) => ({ bill: b, date: dueDateIn(b, now.getFullYear(), now.getMonth()), paid: isPaidThisMonth(b, now) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  return `${day}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'}`;
}

// Bills that should be shown up front on Home: due within `days`, today, overdue, or needing an amount
export function billsNeedingAttention(bills: Bill[], days = 3, now: Date = new Date()) {
  return upcomingBills(bills, days, now).filter(({ bill }) => dueThisMonth(bill, now) && !isPaidThisMonth(bill, now));
}


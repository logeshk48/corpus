import type { Bill } from '@/types/bill';

export const yearMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// The bill's due date in a given month (day 31 → last day of short months), at 9 am
export function dueDateIn(bill: Bill, year: number, month: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(bill.dayOfMonth, daysInMonth), 9, 0);
}

export function isPaidThisMonth(bill: Bill, now: Date = new Date()): boolean {
  return bill.lastLoggedMonth === yearMonth(now);
}

const appliesThisMonth = (bill: Bill, now: Date) => bill.active && bill.startMonth <= yearMonth(now);

// Due today or earlier this month, and not logged yet → the auto-logger should record it
export function isDueToLog(bill: Bill, now: Date = new Date()): boolean {
  if (!appliesThisMonth(bill, now) || isPaidThisMonth(bill, now)) return false;
  return startOfDay(now) >= startOfDay(dueDateIn(bill, now.getFullYear(), now.getMonth()));
}

// Bills this month that haven't been paid/logged yet → Safe-to-Spend keeps this aside
export function unpaidThisMonth(bills: Bill[], now: Date = new Date()): number {
  return bills
    .filter((b) => appliesThisMonth(b, now) && !isPaidThisMonth(b, now))
    .reduce((sum, b) => sum + b.amount, 0);
}

// When is this bill next due, and how many days away?
export function nextDue(bill: Bill, now: Date = new Date()) {
  const today = startOfDay(now);
  let due = dueDateIn(bill, now.getFullYear(), now.getMonth());
  // Unpaid bills from earlier this month stay on THIS month (overdue → daysAway < 0)
  const overdueThisMonth = appliesThisMonth(bill, now) && !isPaidThisMonth(bill, now);
  if (!overdueThisMonth && (isPaidThisMonth(bill, now) || startOfDay(due) < today || bill.startMonth > yearMonth(now))) {
    // next month (or the start month if that's later)
    const base =
      bill.startMonth > yearMonth(now)
        ? new Date(Number(bill.startMonth.slice(0, 4)), Number(bill.startMonth.slice(5)) - 1, 1)
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    due = dueDateIn(bill, base.getFullYear(), base.getMonth());
  }
  const daysAway = Math.round((startOfDay(due).getTime() - today.getTime()) / 86400000);
  return { date: due, daysAway };
}

// Active bills due within the next `days` days, soonest first
export function upcomingBills(bills: Bill[], days = 7, now: Date = new Date()) {
  return bills
    .filter((b) => b.active)
    .map((b) => ({ bill: b, ...nextDue(b, now) }))
    .filter((x) => x.daysAway <= days)
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function monthlyBillsTotal(bills: Bill[]): number {
  return bills.filter((b) => b.active).reduce((sum, b) => sum + b.amount, 0);
}

export function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  return `${day}${{ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th'}`;
}

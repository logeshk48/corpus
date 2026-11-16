import type { Bill, BillFrequency } from '@/types/bill';

export const yearMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const isoDay = (d: Date) => `${yearMonth(d)}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIsoDay = (s: string) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)), 9, 0);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 9, 0);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monthStart = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1);
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);

// The bill's due date in a given month (day 31 → last day of short months), at 9 am
export function dueDateIn(bill: Bill, year: number, month: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(bill.dayOfMonth, daysInMonth), 9, 0);
}

// ── Frequency ─────────────────────────────────────────────

const freqOf = (b: Bill): BillFrequency => b.frequency ?? 'monthly';
// Counted in days from the last payment (a 28-day recharge), not tied to the calendar
export const isDayPlan = (b: Bill) => freqOf(b) === 'days' && !!b.nextDate && (b.everyDays ?? 0) > 0;
const STEP: Record<string, number> = { monthly: 1, bimonthly: 2, quarterly: 3, halfyearly: 6, yearly: 12 };
const perYear = (b: Bill) => (isDayPlan(b) ? 365 / b.everyDays! : 12 / (STEP[freqOf(b)] ?? 1));

// Records itself on the due day. Day-count plans are paid by hand unless you say otherwise.
export const isAuto = (b: Bill) => b.auto ?? !isDayPlan(b);

// Calendar bills only: is the bill due in this calendar month? (month is 0-based)
function calendarDue(bill: Bill, year: number, month: number): boolean {
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (ym < bill.startMonth) return false;
  if (bill.endMonth && ym > bill.endMonth) return false; // after the last payment
  const step = STEP[freqOf(bill)] ?? 1;
  if (step === 1) return true;
  const anchor = (bill.dueMonth ?? 1) - 1; // 0-based
  return (((month - anchor) % step) + step) % step === 0;
}

// Is anything due (or was anything paid) in this calendar month?
export function isDueInMonth(bill: Bill, year: number, month: number): boolean {
  if (!isDayPlan(bill)) return calendarDue(bill, year, month);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (bill.lastLoggedMonth === ym) return true;
  for (let d = fromIsoDay(bill.nextDate!), i = 0; i < 400 && yearMonth(d) <= ym; d = addDays(d, bill.everyDays!), i++) if (yearMonth(d) === ym) return true;
  return false;
}

// What this bill costs per month / per year, on average
export const monthlyEquivalent = (b: Bill) => (b.amount * perYear(b)) / 12;
export const yearlyCost = (b: Bill) => Math.round(b.amount * perYear(b));

const shortMonth = (n: number) => new Date(2000, n - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
export function frequencyLabel(b: Bill): string {
  if (isDayPlan(b)) return `Every ${b.everyDays} days`;
  const step = STEP[freqOf(b)] ?? 1;
  if (step === 1) return 'Every month';
  const a = b.dueMonth ?? 1;
  if (step === 12) return `Every year in ${shortMonth(a)}`;
  const months = Array.from({ length: 12 / step }, (_, k) => shortMonth(((a - 1 + k * step) % 12) + 1));
  return `Every ${step} months (${months.join(', ')})`;
}
// A short tag for lists; nothing for plain monthly bills
export function frequencyTag(b: Bill): string | null {
  if (isDayPlan(b)) return `Every ${b.everyDays} days`;
  const step = STEP[freqOf(b)] ?? 1;
  return step === 1 ? null : step === 12 ? 'Yearly' : `Every ${step} months`;
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

// ── The payment that is waiting ───────────────────────────

// `key` names one payment: 'YYYY-MM' for calendar bills, 'YYYY-MM-DD' for day-count plans.
export type Occurrence = { date: Date; key: string };

// The payment you have to deal with next. A calendar bill that was missed last time
// stays here (late) until it is paid or skipped, instead of vanishing when the month turns.
export function openDue(bill: Bill, now: Date = new Date()): Occurrence {
  if (isDayPlan(bill)) return { date: fromIsoDay(bill.nextDate!), key: bill.nextDate! };
  const done = bill.lastLoggedMonth ?? '';
  // The most recent due month before this one: still unpaid → it is late
  for (let k = 1; k <= 12; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    if (yearMonth(d) < bill.startMonth) break;
    if (!calendarDue(bill, d.getFullYear(), d.getMonth())) continue;
    if (done < yearMonth(d)) return { date: dueDateIn(bill, d.getFullYear(), d.getMonth()), key: yearMonth(d) };
    break;
  }
  for (let k = 0; k <= 24; k++) {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    if (!calendarDue(bill, d.getFullYear(), d.getMonth()) || yearMonth(d) <= done) continue;
    return { date: dueDateIn(bill, d.getFullYear(), d.getMonth()), key: yearMonth(d) };
  }
  const s = monthStart(bill.startMonth); // nothing ahead (ended): fall back to the start
  return { date: dueDateIn(bill, s.getFullYear(), s.getMonth()), key: bill.startMonth };
}

// Unpaid payments from the waiting one up to `until`, oldest first
export function comingDues(bill: Bill, until: Date, now: Date = new Date()): Occurrence[] {
  const out: Occurrence[] = [];
  const first = openDue(bill, now);
  if (isDayPlan(bill)) {
    for (let d = first.date, i = 0; i < 400 && d <= until; d = addDays(d, bill.everyDays!), i++) out.push({ date: d, key: isoDay(d) });
    return out;
  }
  if (first.date <= until) out.push(first);
  const from = monthStart(first.key);
  for (let k = 1; k <= 48; k++) {
    const d = new Date(from.getFullYear(), from.getMonth() + k, 1);
    if (d > until) break;
    if (!calendarDue(bill, d.getFullYear(), d.getMonth())) continue;
    const date = dueDateIn(bill, d.getFullYear(), d.getMonth());
    if (date <= until) out.push({ date, key: yearMonth(d) });
  }
  return out;
}

// ── This month ─────────────────────────────────────────────

// Nothing more to pay this month (paid or skipped)
export function isPaidThisMonth(bill: Bill, now: Date = new Date()): boolean {
  const ym = yearMonth(now);
  if (isDayPlan(bill)) return bill.lastLoggedMonth === ym && bill.nextDate!.slice(0, 7) > ym;
  return bill.lastLoggedMonth === ym;
}
export function isSkippedThisMonth(bill: Bill, now: Date = new Date()): boolean {
  return bill.lastSkippedMonth === yearMonth(now) && isPaidThisMonth(bill, now);
}
// A payment from an earlier month that is still waiting
export function isLate(bill: Bill, now: Date = new Date()): boolean {
  return bill.active && !isFinished(bill, now) && yearMonth(openDue(bill, now).date) < yearMonth(now);
}

// Active and has something to show this month: due, paid, or late from before
export function dueThisMonth(bill: Bill, now: Date = new Date()): boolean {
  if (!bill.active) return false;
  if (isDayPlan(bill)) return bill.nextDate!.slice(0, 7) <= yearMonth(now) || bill.lastLoggedMonth === yearMonth(now);
  return calendarDue(bill, now.getFullYear(), now.getMonth()) || isLate(bill, now);
}

const dueDateReached = (bill: Bill, now: Date) => startOfDay(now) >= startOfDay(openDue(bill, now).date);
const waiting = (bill: Bill, now: Date) => dueThisMonth(bill, now) && !isPaidThisMonth(bill, now) && !isFinished(bill, now) && dueDateReached(bill, now);

// Fixed amount, set to record itself, and its day has come → record it
export function isDueToLog(bill: Bill, now: Date = new Date()): boolean {
  return !bill.variable && isAuto(bill) && waiting(bill, now);
}

// Variable bill whose day has come → ask the user for this month's amount
export function needsAmount(bill: Bill, now: Date = new Date()): boolean {
  return !!bill.variable && waiting(bill, now);
}

// Still-unpaid bills this month → Safe-to-Spend keeps this aside (variable = its usual amount)
export function unpaidThisMonth(bills: Bill[], now: Date = new Date()): number {
  return bills
    .filter((b) => dueThisMonth(b, now) && !isPaidThisMonth(b, now))
    .reduce((sum, b) => sum + b.amount, 0);
}

// ── Next due date ─────────────────────────────────────────

// The next payment to deal with. daysAway < 0 means it is late.
export function nextDue(bill: Bill, now: Date = new Date()) {
  const { date } = openDue(bill, now);
  return { date, daysAway: daysBetween(date, now) };
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

// ── A month on the calendar ───────────────────────────────

export type DayState = 'paid' | 'due' | 'overdue' | 'skipped';

// Every bill mark for one calendar month. A late payment from an earlier month sits on today.
export function monthEntries(bills: Bill[], year: number, month: number, now: Date = new Date()) {
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  const isNow = ym === yearMonth(now);
  const end = new Date(year, month + 1, 0, 23, 59);
  const out: { bill: Bill; date: Date; state: DayState }[] = [];
  for (const b of bills) {
    if (!b.active || isFinished(b, now)) {
      if (b.active && isNow && b.lastLoggedMonth === ym && !isDayPlan(b)) out.push({ bill: b, date: dueDateIn(b, year, month), state: 'paid' }); // last EMI, paid this month
      continue;
    }
    if (isNow && b.lastLoggedMonth === ym) {
      const date = isDayPlan(b) ? (b.lastPaidDate ? fromIsoDay(b.lastPaidDate) : now) : dueDateIn(b, year, month);
      if (yearMonth(date) === ym) out.push({ bill: b, date, state: b.lastSkippedMonth === ym ? 'skipped' : 'paid' });
    }
    for (const o of comingDues(b, end, now)) {
      const k = yearMonth(o.date);
      if (k === ym) out.push({ bill: b, date: o.date, state: daysBetween(o.date, now) < 0 ? 'overdue' : 'due' });
      else if (k < ym && isNow) out.push({ bill: b, date: now, state: 'overdue' });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Everything in the current calendar month (for the month rail)
export function thisMonthBills(bills: Bill[], now: Date = new Date()) {
  return monthEntries(bills, now.getFullYear(), now.getMonth(), now).map((e) => ({ bill: e.bill, date: e.date, paid: e.state === 'paid' || e.state === 'skipped' }));
}

export function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  return `${day}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'}`;
}

// Bills that should be shown up front on Home: due within `days`, today, overdue, or needing an amount
export function billsNeedingAttention(bills: Bill[], days = 3, now: Date = new Date()) {
  return upcomingBills(bills, days, now).filter(({ bill }) => dueThisMonth(bill, now) && !isPaidThisMonth(bill, now));
}

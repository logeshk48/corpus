import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { dueDateIn, isDueInMonth, isFinished, isPaidThisMonth } from './bills';

// ─── Is your money enough? ───
const DAY = 86_400_000;

// Unpaid bills falling due in the next `days` (this month's unpaid + next month's)
export function upcomingBills(bills: Bill[], now = new Date(), days = 30) {
  const end = now.getTime() + days * DAY;
  const out: { bill: Bill; due: Date; amount: number }[] = [];
  for (const b of bills) {
    if (!b.active || isFinished(b, now)) continue;
    for (let k = 0; k <= 1; k++) {
      const y = now.getFullYear();
      const m = now.getMonth() + k;
      const yy = y + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12;
      if (!isDueInMonth(b, yy, mm)) continue;
      if (k === 0 && isPaidThisMonth(b, now)) continue;
      if (b.startMonth && `${yy}-${String(mm + 1).padStart(2, '0')}` < b.startMonth) continue;
      if (b.endMonth && `${yy}-${String(mm + 1).padStart(2, '0')}` > b.endMonth) continue;
      const due = dueDateIn(b, yy, mm);
      if (due.getTime() <= end) out.push({ bill: b, due, amount: b.amount });
    }
  }
  return out.sort((a, b) => a.due.getTime() - b.due.getTime());
}

// Average daily spending over the last 30 days (needs ≥ 7 days of history)
export function dailySpend(tx: Transaction[], now = new Date()) {
  const from = now.getTime() - 30 * DAY;
  const exp = tx.filter((t) => t.type === 'expense' && new Date(t.date).getTime() > from);
  if (exp.length === 0) return 0;
  const oldest = Math.min(...exp.map((t) => new Date(t.date).getTime()));
  const span = Math.max(7, Math.min(30, (now.getTime() - oldest) / DAY));
  return exp.reduce((s, t) => s + t.amount, 0) / span;
}

// Average monthly spending over the last 3 full-ish months
export function monthlySpend(tx: Transaction[], now = new Date()) {
  const from = now.getTime() - 90 * DAY;
  const exp = tx.filter((t) => t.type === 'expense' && new Date(t.date).getTime() > from);
  if (exp.length === 0) return 0;
  const oldest = Math.min(...exp.map((t) => new Date(t.date).getTime()));
  const months = Math.max(1, Math.min(3, (now.getTime() - oldest) / (30 * DAY)));
  return exp.reduce((s, t) => s + t.amount, 0) / months;
}

export type MoneyHealth = {
  have: number;
  billsDue: number;       // next 30 days
  cardDues: number;
  free: number;           // have − bills due − card dues
  short: boolean;         // not enough to cover what's due
  perDay: number;
  runwayDays: number | null;
  idle: number;           // cash beyond a 3-month buffer
  monthly: number;
};

export function moneyHealth(have: number, cardDues: number, bills: Bill[], tx: Transaction[], now = new Date()): MoneyHealth {
  const billsDue = upcomingBills(bills, now).reduce((s, b) => s + b.amount, 0);
  const free = have - billsDue - cardDues;
  const perDay = dailySpend(tx, now);
  const monthly = monthlySpend(tx, now);
  const runwayDays = perDay > 0 ? Math.max(0, Math.floor(Math.max(0, have - cardDues) / perDay)) : null;
  const buffer = monthly * 3 + billsDue;
  const idle = monthly > 0 ? Math.max(0, Math.round(have - cardDues - buffer)) : 0;
  return { have, billsDue, cardDues, free, short: free < 0, perDay: Math.round(perDay), runwayDays, idle, monthly: Math.round(monthly) };
}

// Card health: utilisation + the minimum-payment trap
export function cardHealth(owed: number, limit?: number) {
  const used = limit ? Math.round((Math.max(0, owed) / limit) * 100) : null;
  return {
    used,
    warn: used !== null && used > 30,
    // Indian cards charge ~3.5%/month (~42%/yr) on unpaid balances
    monthlyInterestIfUnpaid: Math.round(Math.max(0, owed) * 0.035),
  };
}

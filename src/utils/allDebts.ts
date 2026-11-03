// Every debt in one list: loans & EMIs, credit cards, money borrowed from people.
// Each with its yearly interest rate (so the costliest is obvious), what you pay a month,
// and roughly what it costs you in interest each month.
import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import type { AccountBalance } from './accounts';
import { debtSummary } from './debts';

export type DebtKind = 'loan' | 'emi' | 'card' | 'person';
export type DebtLine = {
  id: string;
  kind: DebtKind;
  name: string;
  balance: number;
  rate: number | null;    // % a year; null = not known
  rateNote: string;       // "42% a year (typical card rate)", "Interest-free", "Add loan details for the rate"
  monthlyPay: number;     // EMI / minimum due / interest you pay
  monthsLeft: number | null;
  interestPerMonth: number; // rough: balance × rate / 12
  link: string;
};

// Indian credit cards charge ~3.5–3.75% a month on unpaid balances (42–45% a year)
export const CARD_RATE = 42;
export const CARD_MIN_DUE = 0.05; // minimum due ≈ 5% of the balance

export function allDebts(p: { ious: Iou[]; bills: Bill[]; accounts: AccountBalance[]; now?: Date }): DebtLine[] {
  const now = p.now ?? new Date();
  const s = debtSummary(p.ious, p.bills, now);
  const out: DebtLine[] = [];
  for (const e of s.emis) {
    const bill = p.bills.find((b) => b.id === e.billId);
    const rate = bill?.loan?.annualRate ?? null;
    out.push({
      id: `emi:${e.billId}`, kind: bill?.loan ? 'loan' : 'emi', name: e.name, balance: e.outstanding, rate,
      rateNote: rate != null ? `${rate}% a year` : 'Rate unknown — add loan details',
      monthlyPay: e.emi, monthsLeft: e.paymentsLeft, interestPerMonth: rate != null ? Math.round((e.outstanding * rate) / 1200) : 0,
      link: `/bill/${e.billId}`,
    });
  }
  for (const a of p.accounts) {
    if (a.type !== 'credit' || a.archived || a.balance <= 0) continue;
    out.push({
      id: `card:${a.id}`, kind: 'card', name: a.name, balance: Math.round(a.balance), rate: CARD_RATE,
      rateNote: `~${CARD_RATE}% a year if not paid in full`,
      monthlyPay: Math.max(200, Math.round(a.balance * CARD_MIN_DUE)), monthsLeft: null,
      interestPerMonth: Math.round((a.balance * CARD_RATE) / 1200), link: '/accounts',
    });
  }
  for (const d of s.people) {
    const iou = p.ious.find((i) => i.id === d.id);
    const rate = iou?.ratePerHundred ? iou.ratePerHundred * 12 : 0;
    out.push({
      id: `iou:${d.id}`, kind: 'person', name: d.person, balance: d.amount, rate,
      rateNote: rate ? `₹${iou!.ratePerHundred} per ₹100 a month = ${rate}% a year` : 'Interest-free',
      monthlyPay: d.monthlyInterest, monthsLeft: null, interestPerMonth: Math.round(d.monthlyInterest), link: '/ious',
    });
  }
  // costliest first; unknown rates after known ones; then biggest balance
  return out.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.balance - a.balance);
}

export function debtTotals(list: DebtLine[]) {
  return {
    total: list.reduce((a, d) => a + d.balance, 0),
    monthly: list.reduce((a, d) => a + d.monthlyPay, 0),
    interest: list.reduce((a, d) => a + d.interestPerMonth, 0),
    unknownRates: list.filter((d) => d.rate == null).length,
  };
}

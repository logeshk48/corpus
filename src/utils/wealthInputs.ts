// Gathers everything the Wealth Builder Score needs from the rest of the app.
import type { Bill } from '@/types/bill';
import type { Investment } from '@/types/investment';
import type { IncomeStream } from '@/types/incomeStream';
import type { Iou } from '@/types/iou';
import type { Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';
import { isLate } from './bills';
import { debtSummary } from './debts';
import { currentValue, portfolio } from './investments';
import type { NwItem, NwTotals } from './netWorth';
import { monthlySipTotal } from './sip';
import { monthlyFlows, type ScoreInput } from './wealthScore';

export function scoreInputs(p: {
  tx: Transaction[]; // last 12 months
  investments: Investment[];
  ious: Iou[];
  bills: Bill[];
  items: NwItem[];
  totals: NwTotals;
  cardDues: number;
  hasAccounts: boolean;
  streams?: IncomeStream[];             // income that varies needs a bigger cushion
  protection?: Settings['protection'];  // insurance answers
  now?: Date;
}): ScoreInput {
  const now = p.now ?? new Date();
  const debt = debtSummary(p.ious, p.bills, now);
  // emergency money: bank + cash, FDs and debt funds (not shares — they can be down 30% when you need them)
  const cash = p.items.filter((i) => i.group === 'cash').reduce((s, i) => s + Math.max(0, i.value), 0);
  const safeInv = p.investments
    .filter((h) => h.type === 'fd' || (h.type === 'mf' && h.fundClass === 'debt'))
    .reduce((s, h) => s + currentValue(h, now).value, 0);
  const pf = portfolio(p.investments, now);
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const skipped = p.investments.reduce((a, h) => a + (h.sipLog ?? []).filter((l) => l.status === 'skipped' && new Date(l.date) >= yearAgo).length, 0);
  return {
    flows: monthlyFlows(p.tx, p.investments, 7, now),
    emergencyMoney: cash + safeInv,
    emergencyKnown: p.hasAccounts || safeInv > 0,
    monthlyEmi: debt.monthlyEmi,
    monthlyInterest: debt.monthlyInterest,
    cardDues: p.cardDues,
    debtTotal: p.totals.liabilities,
    assetsTotal: p.totals.assets,
    netWorth: p.totals.total,
    sipMonthly: monthlySipTotal(p.investments),
    sipSkipped12: skipped,
    equityShare: pf.value > 0 ? pf.allocation.find((a) => a.cls === 'equity')?.share ?? 0 : null,
    investedTotal: pf.value,
    // no income sources set up yet: assume it varies (most people's does), so the cushion target is 9 months
    incomeVaries: !p.streams?.length || p.streams.some((s) => !s.fixed),
    lateBills: p.bills.filter((b) => isLate(b, now)).length,
    protection: p.protection,
  };
}

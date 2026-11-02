import type { Bill } from '@/types/bill';
import type { Investment } from '@/types/investment';
import { investMeta } from '@/types/investment';
import type { Iou } from '@/types/iou';
import { debtSummary } from './debts';
import { currentValue } from './investments';
import type { NwItem } from './netWorth';
import { OTHER_RATE, type ProjectionInput } from './projection';
import { EXPECTED } from './returns';
import type { ScoreInput } from './wealthScore';
import { recentAverage } from './wealthScore';

export function projectionInputs(p: { items: NwItem[]; investments: Investment[]; ious: Iou[]; bills: Bill[]; score: ScoreInput }): ProjectionInput {
  const avg = recentAverage(p.score.flows);
  const debt = debtSummary(p.ious, p.bills);
  const loanDebt = debt.emis.reduce((a, e) => a + e.outstanding, 0);
  const liabilities = p.items.filter((i) => i.side === 'liability').reduce((a, i) => a + i.value, 0);
  return {
    cash: p.items.filter((i) => i.group === 'cash').reduce((a, i) => a + i.value, 0),
    investments: p.investments.map((h) => ({ value: currentValue(h).value, rate: EXPECTED[investMeta(h.type).cls] ?? 6 })),
    others: p.items.filter((i) => i.side === 'asset' && OTHER_RATE[i.group] != null).map((i) => ({ value: i.value, rate: OTHER_RATE[i.group] })),
    loans: debt.emis.map((e) => ({ outstanding: e.outstanding, emi: e.emi, monthsLeft: e.paymentsLeft ?? 0 })),
    otherDebt: Math.max(0, liabilities - loanDebt),
    monthlySave: avg ? avg.income - avg.spend : 0,
    monthlyInvest: p.score.sipMonthly,
  };
}

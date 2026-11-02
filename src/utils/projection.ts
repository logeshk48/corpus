// Where your net worth is heading, month by month, if today's habits continue.
// Kept deliberately simple and a little conservative:
//  • investments grow at long-run averages for what you hold (equity 12%, debt 7%, gold 8%, PF/PPF 8%)
//  • bank cash earns ~2.7%; homes/land +5%; vehicles −12%; other assets flat
//  • you keep saving what you saved on average over the last 3 months; your SIPs go into investments,
//    the rest of your savings stays as cash (step 5 shows what changes if you invest it)
//  • EMI loans shrink to zero by their end date, and that EMI becomes extra savings afterwards
//  • card dues and money owed to people stay as they are
export type Bucket = { value: number; rate: number }; // rate: % a year
export type LoanLine = { outstanding: number; emi: number; monthsLeft: number };
export type ProjectionInput = {
  cash: number;
  investments: Bucket[];
  others: Bucket[];
  loans: LoanLine[];
  otherDebt: number;
  monthlySave: number;   // average saved a month (income − spending; EMIs are part of spending)
  monthlyInvest: number; // SIPs a month (part of monthlySave)
  investAll?: boolean;   // what-if: invest all savings, not just SIPs
  extraSave?: number;    // what-if: save this much more a month
  stepUpPct?: number;    // what-if: raise SIPs by x% each year
  moveToInvest?: number; // what-if: move this much cash into investments today (idle cash)
  cashRate?: number;
};
export type ProjectionPoint = { month: number; netWorth: number; invested: number; cash: number; debt: number };

const mrate = (yearly: number) => Math.pow(1 + yearly / 100, 1 / 12) - 1;

export function project(p: ProjectionInput, years: number): ProjectionPoint[] {
  const invValue = p.investments.reduce((a, b) => a + b.value, 0);
  const invRate = invValue > 0 ? p.investments.reduce((a, b) => a + b.value * b.rate, 0) / invValue : 11; // new money: mostly equity SIPs
  const ri = mrate(invRate || 11), rc = mrate(p.cashRate ?? 2.7);
  const moved = Math.max(0, Math.min(p.moveToInvest ?? 0, p.cash));
  let inv = invValue + moved, cash = p.cash - moved;
  let others = p.others.map((o) => ({ ...o }));
  let loans = p.loans.map((l) => ({ ...l }));
  let sip = p.monthlyInvest;
  const out: ProjectionPoint[] = [];
  const debtNow = () => loans.reduce((a, l) => a + l.outstanding, 0) + p.otherDebt;
  const nw = () => inv + cash + others.reduce((a, o) => a + o.value, 0) - debtNow();
  out.push({ month: 0, netWorth: nw(), invested: inv, cash, debt: debtNow() });
  for (let m = 1; m <= years * 12; m++) {
    if (m > 1 && (m - 1) % 12 === 0 && p.stepUpPct) sip *= 1 + p.stepUpPct / 100;
    // loans: pay down evenly; a finished loan's EMI becomes savings
    let freed = 0;
    loans = loans.map((l) => {
      if (l.monthsLeft <= 0) return l;
      const left = l.monthsLeft - 1;
      if (left === 0) freed += l.emi;
      return { ...l, monthsLeft: left, outstanding: left === 0 ? 0 : l.outstanding - l.outstanding / l.monthsLeft };
    });
    const save = p.monthlySave + (p.extraSave ?? 0) + (sip - p.monthlyInvest); // step-up money comes on top
    p = { ...p, monthlySave: p.monthlySave + freed }; // this month's EMI was the last one — saved from next month
    const toInvest = p.investAll ? Math.max(0, save) : Math.min(Math.max(0, save), sip);
    inv = inv * (1 + ri) + toInvest;
    cash = cash * (1 + rc) + (save - toInvest);
    others = others.map((o) => ({ ...o, value: o.value * (1 + mrate(o.rate)) }));
    if (m % 12 === 0 || m === 1) out.push({ month: m, netWorth: nw(), invested: inv, cash, debt: debtNow() });
  }
  return out;
}

// Value in today's rupees (inflation ~6%)
export const real = (value: number, months: number, inflation = 6) => value / Math.pow(1 + inflation / 100, months / 12);

// First month the projection reaches `target` (nominal), or null
export function whenReaches(points: ProjectionPoint[], target: number) {
  const hit = points.find((pt) => pt.netWorth >= target);
  return hit ? hit.month : null;
}

export const OTHER_RATE: Record<string, number> = { home: 5, property: 5, gold: 8, vehicle: -12, receivable: 0, other: 0 };

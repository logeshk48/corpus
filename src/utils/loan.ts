import type { Loan } from '@/types/bill';

// ── Standard reducing-balance EMI maths (what Indian banks use) ──
// EMI = P·r·(1+r)^n / ((1+r)^n − 1),  r = annual rate / 12 / 100

export function monthlyRate(annualRate: number): number {
  return annualRate / 12 / 100;
}

export function calcEmi(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRate(annualRate);
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

const ymIndex = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5)) - 1;
const indexToYm = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const dateToIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export type ScheduleRow = {
  number: number;   // 1-based EMI number
  month: string;    // 'YYYY-MM'
  emi: number;      // amount paid that month (last one may be smaller)
  interest: number;
  principal: number;
  prepayment: number;
  balance: number;  // after this month
};

// Full schedule, applying recorded prepayments (in the month they happened, after that EMI)
export function buildSchedule(loan: Loan, extra?: { monthIndex: number; amount: number; mode: 'tenure' | 'emi' }): ScheduleRow[] {
  const r = monthlyRate(loan.annualRate);
  let emi = calcEmi(loan.principal, loan.annualRate, loan.tenureMonths);
  let balance = loan.principal;
  const start = ymIndex(loan.firstEmiMonth);
  const prepays = [...(loan.prepayments ?? [])].map((p) => ({ index: dateToIndex(new Date(p.date)), amount: p.amount, mode: p.mode }));
  if (extra) prepays.push({ index: extra.monthIndex, amount: extra.amount, mode: extra.mode });

  const rows: ScheduleRow[] = [];
  for (let k = 0; k < 1200 && balance > 0.5; k++) {
    const idx = start + k;
    const interest = balance * r;
    let principalPart = Math.min(emi - interest, balance);
    if (principalPart < 0) principalPart = 0; // guard against bad inputs
    balance -= principalPart;

    let prepayment = 0;
    for (const p of prepays.filter((x) => x.index === idx)) {
      const amt = Math.min(p.amount, balance);
      balance -= amt;
      prepayment += amt;
      if (p.mode === 'emi' && balance > 0.5) {
        // keep the original end date, lower the EMI
        const monthsLeft = loan.tenureMonths - (k + 1);
        if (monthsLeft > 0) emi = calcEmi(balance, loan.annualRate, monthsLeft);
      }
    }

    rows.push({
      number: k + 1,
      month: indexToYm(idx),
      emi: principalPart + interest,
      interest,
      principal: principalPart,
      prepayment,
      balance: Math.max(balance, 0),
    });
  }
  return rows;
}

export type LoanStatus = {
  emi: number;               // current EMI
  paidCount: number;         // EMIs already paid (by the calendar)
  totalCount: number;        // EMIs in the (adjusted) schedule
  outstanding: number;       // principal still owed now
  principalRepaid: number;
  interestPaid: number;
  interestRemaining: number;
  totalInterest: number;
  totalPrepaid: number;
  endMonth: string;          // 'YYYY-MM' of the last EMI
  current?: ScheduleRow;     // this month's EMI split
  finished: boolean;
};

// Where the loan stands today. EMIs are assumed to be paid on schedule (auto-debit);
// this month counts as paid once Corpus has recorded it.
export function loanStatus(loan: Loan, paidThisMonth: boolean, now: Date = new Date()): LoanStatus {
  const rows = buildSchedule(loan);
  const nowIdx = dateToIndex(now);
  const paidRows = rows.filter((row) => {
    const i = ymIndex(row.month);
    return i < nowIdx || (i === nowIdx && paidThisMonth);
  });
  const last = paidRows[paidRows.length - 1];
  const outstanding = last ? last.balance : loan.principal;
  const interestPaid = paidRows.reduce((s, x) => s + x.interest, 0);
  const totalInterest = rows.reduce((s, x) => s + x.interest, 0);
  const current = rows.find((x) => ymIndex(x.month) === nowIdx);
  const lastRow = rows[rows.length - 1];
  const nextRow = rows.find((x) => ymIndex(x.month) >= nowIdx && !(ymIndex(x.month) === nowIdx && paidThisMonth));
  return {
    emi: nextRow ? nextRow.emi : current ? current.emi : 0,
    paidCount: paidRows.length,
    totalCount: rows.length,
    outstanding,
    principalRepaid: loan.principal - outstanding,
    interestPaid,
    interestRemaining: totalInterest - interestPaid,
    totalInterest,
    totalPrepaid: rows.reduce((s, x) => s + x.prepayment, 0),
    endMonth: lastRow ? lastRow.month : loan.firstEmiMonth,
    current,
    finished: paidRows.length >= rows.length && rows.length > 0,
  };
}

export type PrepaymentImpact = {
  interestSaved: number;
  monthsSaved: number;     // reduce-tenure mode
  newEndMonth: string;
  newEmi: number;          // reduce-EMI mode
};

// "What if I pay `amount` extra this month?"
export function prepaymentImpact(
  loan: Loan,
  amount: number,
  mode: 'tenure' | 'emi',
  now: Date = new Date()
): PrepaymentImpact {
  const before = buildSchedule(loan);
  const after = buildSchedule(loan, { monthIndex: dateToIndex(now), amount, mode });
  const interest = (rows: ScheduleRow[]) => rows.reduce((s, x) => s + x.interest, 0);
  const nextIdx = dateToIndex(now) + 1;
  const nextAfter = after.find((x) => ymIndex(x.month) === nextIdx);
  return {
    interestSaved: Math.max(interest(before) - interest(after), 0),
    monthsSaved: Math.max(before.length - after.length, 0),
    newEndMonth: after.length ? after[after.length - 1].month : loan.firstEmiMonth,
    newEmi: nextAfter ? nextAfter.emi : 0,
  };
}

// Year-by-year summary of the schedule
export function yearlySummary(rows: ScheduleRow[]) {
  const map = new Map<string, { year: string; principal: number; interest: number; prepayment: number; balance: number }>();
  for (const row of rows) {
    const y = row.month.slice(0, 4);
    const e = map.get(y) ?? { year: y, principal: 0, interest: 0, prepayment: 0, balance: 0 };
    e.principal += row.principal;
    e.interest += row.interest;
    e.prepayment += row.prepayment;
    e.balance = row.balance;
    map.set(y, e);
  }
  return [...map.values()];
}

export function endMonthFor(loan: Loan): string {
  const rows = buildSchedule(loan);
  return rows.length ? rows[rows.length - 1].month : loan.firstEmiMonth;
}

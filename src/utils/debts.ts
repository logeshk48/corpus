import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import { isFinished, isPaidThisMonth, isSkippedThisMonth, remainingPayments } from './bills';
import { isOpen, isOverdue, remaining } from './iou';
import { loanStatus } from './loan';
import { interestStatus } from './interest';

// ─── Everything you owe, in one place: people + EMIs ───

export type PersonDebt = { id: string; person: string; amount: number; note?: string; dueDate?: string; overdue: boolean; monthlyInterest: number; interestPending: number; interestPaid: number; nextInterestDue?: Date };
export type EmiDebt = {
  billId: string;
  name: string;
  emi: number;            // per payment
  paymentsLeft: number | null;
  outstanding: number;    // loan principal left (if loan details) else EMIs × payments left
  exact: boolean;         // true = from loan details (principal), false = estimated from EMIs left
  endMonth?: string;
};

export function debtSummary(ious: Iou[], bills: Bill[], now = new Date()) {
  const people: PersonDebt[] = ious
    .filter((i) => i.direction === 'borrowed' && isOpen(i))
    .map((i) => {
      const st = interestStatus(i, now);
      return {
        id: i.id, person: i.person.trim(), amount: remaining(i), note: i.note, dueDate: i.dueDate,
        overdue: isOverdue(i, now) || (st?.pending ?? 0) > 0,
        monthlyInterest: st?.monthly ?? 0, interestPending: st?.pending ?? 0, interestPaid: st?.paid ?? 0, nextInterestDue: st?.nextDue,
      };
    })
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.amount - a.amount);

  const emis: EmiDebt[] = bills
    .filter((b) => b.active && (b.loan || b.endMonth) && !isFinished(b, now))
    .map((b) => {
      const left = remainingPayments(b, now);
      if (b.loan) {
        const st = loanStatus(b.loan, isPaidThisMonth(b, now) && !isSkippedThisMonth(b, now), now);
        return { billId: b.id, name: b.name, emi: Math.round(st.emi || b.amount), paymentsLeft: st.totalCount - st.paidCount, outstanding: Math.round(st.outstanding), exact: true, endMonth: st.endMonth };
      }
      return { billId: b.id, name: b.name, emi: b.amount, paymentsLeft: left, outstanding: b.amount * (left ?? 0), exact: false, endMonth: b.endMonth };
    })
    .filter((e) => e.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  const owedToPeople = people.reduce((s, p) => s + p.amount, 0);
  const owedOnLoans = emis.reduce((s, e) => s + e.outstanding, 0);
  return {
    people,
    emis,
    owedToPeople,
    owedOnLoans,
    total: owedToPeople + owedOnLoans,
    monthlyEmi: emis.reduce((s, e) => s + e.emi, 0),
    monthlyInterest: people.reduce((s, p) => s + p.monthlyInterest, 0),
    interestPending: people.reduce((s, p) => s + p.interestPending, 0),
    interestPaid: people.reduce((s, p) => s + p.interestPaid, 0),
  };
}

// ─── Chains: borrowed from A → gave to B. When B pays you, repay A. ───
export type ChainNudge = {
  borrowed: Iou;       // what you owe A (still open)
  lent: Iou;           // what B owed you
  receivedBack: number;// how much B has paid you so far
  repayNow: number;    // what you can pass on to A right now
};

export function chainNudges(ious: Iou[]): ChainNudge[] {
  const byId = new Map(ious.map((i) => [i.id, i]));
  const out: ChainNudge[] = [];
  for (const b of ious) {
    if (b.direction !== 'borrowed' || !b.linkedId || !isOpen(b)) continue;
    const l = byId.get(b.linkedId);
    if (!l || l.direction !== 'lent') continue;
    const receivedBack = l.amount - remaining(l);
    const alreadyRepaid = b.amount - remaining(b);
    // pass on what came back, minus what you've already repaid A
    const repayNow = Math.min(remaining(b), Math.max(0, receivedBack - alreadyRepaid));
    if (repayNow > 0) out.push({ borrowed: b, lent: l, receivedBack, repayNow });
  }
  return out;
}

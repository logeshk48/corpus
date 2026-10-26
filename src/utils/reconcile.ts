import type { Iou } from '@/types/iou';
import type { Transaction } from '@/types/transaction';

// ─── "Missing money": compare how your money changed with what you logged ───
// Net = cash + bank + wallets − card dues. Paying a card bill or moving money into
// a jar doesn't change Net, so only real income/spending and lending should.

export type Reconcile = {
  from: string;          // previous check-in
  to: string;            // this check-in
  actualChange: number;  // net now − net then
  loggedIncome: number;
  loggedSpend: number;
  peopleFlow: number;    // money in/out with people (lent, borrowed, paybacks, interest)
  expectedChange: number;
  gap: number;           // actual − expected: < 0 = spending you didn't log, > 0 = income you didn't log
};

const inWin = (iso: string, a: number, b: number) => {
  const t = new Date(iso).getTime();
  return t > a && t <= b;
};

export function peopleFlowBetween(ious: Iou[], a: number, b: number) {
  let flow = 0;
  for (const i of ious) {
    if ((i.kind ?? 'loan') !== 'loan' && i.kind !== 'support' && i.kind !== 'gift') continue;
    const sign = i.direction === 'lent' ? -1 : 1; // lending/giving takes money out, borrowing/receiving brings it in
    if (inWin(i.date, a, b)) flow += sign * i.amount;
    for (const r of i.repayments ?? []) if (inWin(r.date, a, b)) flow -= sign * r.amount;
    for (const r of i.interestPayments ?? []) if (inWin(r.date, a, b)) flow -= sign * r.amount;
  }
  return flow;
}

export function reconcile(prev: { date: string; net: number }, now: { date: string; net: number }, tx: Transaction[], ious: Iou[]): Reconcile {
  const a = new Date(prev.date).getTime();
  const b = new Date(now.date).getTime();
  let loggedIncome = 0;
  let loggedSpend = 0;
  for (const t of tx) {
    if (!inWin(t.date, a, b)) continue;
    if (t.type === 'income') loggedIncome += t.amount;
    else loggedSpend += t.amount;
  }
  const peopleFlow = peopleFlowBetween(ious, a, b);
  const actualChange = Math.round(now.net - prev.net);
  const expectedChange = Math.round(loggedIncome - loggedSpend + peopleFlow);
  return { from: prev.date, to: now.date, actualChange, loggedIncome, loggedSpend, peopleFlow, expectedChange, gap: actualChange - expectedChange };
}

// Small differences (rounding, a forgotten chai) aren't worth a warning
export const gapMatters = (r: Reconcile) => Math.abs(r.gap) >= Math.max(200, Math.abs(r.actualChange) * 0.03);

export const addCheckinTotal = (list: { date: string; net: number }[] | undefined, net: number, now = new Date()) =>
  [...(list ?? []).filter((c) => c.date.slice(0, 10) !== now.toISOString().slice(0, 10)), { date: now.toISOString(), net }].slice(-26);

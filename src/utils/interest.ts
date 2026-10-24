import type { Iou } from '@/types/iou';

// ─── Interest-only loans (Indian "₹X per hundred per month") ───

export const yearlyRate = (perHundred: number) => Math.round(perHundred * 12 * 100) / 100;

function addMonths(d: Date, n: number) {
  const day = d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, last));
  return x;
}

// Principal still open just before a moment in time
function principalAt(iou: Iou, at: Date) {
  const repaid = (iou.repayments ?? []).filter((r) => new Date(r.date) < at).reduce((s, r) => s + r.amount, 0);
  return Math.max(0, iou.amount - repaid);
}

export type InterestStatus = {
  monthly: number;        // interest for the coming month on today's principal
  monthsDue: number;      // full months completed since the loan started
  accrued: number;        // total interest for those months
  paid: number;           // interest paid / received so far
  pending: number;        // accrued − paid (what's due right now)
  monthsBehind: number;   // pending ÷ monthly, rounded down
  nextDue: Date;          // next monthly due date
};

export function interestStatus(iou: Iou, now = new Date()): InterestStatus | null {
  const rate = iou.ratePerHundred;
  if (!rate || rate <= 0) return null;
  const start = new Date(iou.date);
  const end = iou.settledAt ? new Date(iou.settledAt) : now;
  let accrued = 0;
  let k = 1;
  // month k is due on start + k months; interest on the principal open at the start of that month
  while (addMonths(start, k) <= end) {
    accrued += (principalAt(iou, addMonths(start, k - 1)) * rate) / 100;
    k++;
  }
  const paid = (iou.interestPayments ?? []).reduce((s, p) => s + p.amount, 0);
  const monthly = (principalAt(iou, new Date(now.getTime() + 1)) * rate) / 100;
  const pending = Math.max(0, Math.round(accrued - paid));
  return {
    monthly: Math.round(monthly),
    monthsDue: k - 1,
    accrued: Math.round(accrued),
    paid: Math.round(paid),
    pending,
    monthsBehind: k > 1 && accrued > 0 ? Math.floor(pending / (accrued / (k - 1)) + 0.001) : 0,
    nextDue: addMonths(start, k),
  };
}

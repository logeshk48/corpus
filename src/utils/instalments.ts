import type { Iou } from '@/types/iou';
import { isOpen, remaining, repaid } from './iou';

function addMonths(d: Date, n: number) {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  return x;
}

// "₹2,000/month · 3 of 5 paid · next 24 Nov" — first instalment one month after the loan date
export function instalmentStatus(i: Iou, now = new Date()) {
  const per = i.instalment;
  if (!per || per <= 0) return null;
  const total = Math.ceil(i.amount / per);
  const paidCount = Math.min(total, Math.floor((repaid(i) + 0.01) / per));
  const start = new Date(i.date);
  let due = 0; // instalments whose date has passed
  while (due < total && addMonths(start, due + 1) <= now) due++;
  const behind = Math.max(0, due - paidCount);
  const nextDue = paidCount < total ? addMonths(start, paidCount + 1) : undefined;
  return { per, total, paidCount, behind, nextDue, thisPayment: Math.min(per, remaining(i)), finishes: addMonths(start, total) };
}

// Gentle checks shown while adding a loan
export function lendingWarnings(ious: Iou[], person: string, amount: number, direction: Iou['direction'], now = new Date()) {
  const out: string[] = [];
  const key = person.trim().toLowerCase();
  if (direction === 'lent' && key) {
    const open = ious.filter((i) => i.direction === 'lent' && isOpen(i) && i.person.trim().toLowerCase() === key);
    const owed = open.reduce((s, i) => s + remaining(i), 0);
    const oldest = open.reduce<string | undefined>((m, i) => (!m || i.date < m ? i.date : m), undefined);
    const days = oldest ? Math.floor((now.getTime() - new Date(oldest).getTime()) / 86_400_000) : 0;
    if (owed > 0 && days >= 14) {
      out.push(`${person.trim()} already owes you ₹${owed.toLocaleString('en-IN')} from ${days >= 60 ? `${Math.floor(days / 30)} months` : `${Math.floor(days / 7)} weeks`} ago. Maybe settle that first?`);
    }
  }
  if (amount >= 20000) {
    out.push('Loans of ₹20,000 or more should go by UPI or bank transfer, not cash (Income Tax Act 269SS/269T). Add the UPI reference as proof below.');
  }
  return out;
}

// Debts close to 3 years old: recovery claims generally expire 3 years after they fall due (Limitation Act)
export function agingWarning(i: Iou, now = new Date()) {
  if (!isOpen(i)) return null;
  const from = new Date(i.dueDate ?? i.date);
  const months = (now.getTime() - from.getTime()) / (30.44 * 86_400_000);
  if (months < 30) return null;
  return months >= 36
    ? 'Over 3 years old. A written acknowledgement from them restarts the clock'
    : 'Nearly 3 years old. Ask them to confirm it in writing (even a WhatsApp reply) to keep it valid';
}

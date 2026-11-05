// Turns detections into Home "Found for you" items (wired with actions in HomeScreen)
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { duplicates, repeatingPayments, type Duplicate, type Repeating } from './detect';

export type Finding = { kind: 'repeating'; r: Repeating } | { kind: 'duplicate'; d: Duplicate };

export function findings(p: { tx: Transaction[]; bills: Bill[]; dismissed: string[]; now?: Date }): Finding[] {
  const out: Finding[] = [];
  // double entries first: they make every other number wrong
  for (const d of duplicates(p.tx, p.now)) if (!p.dismissed.includes(d.key)) out.push({ kind: 'duplicate', d });
  for (const r of repeatingPayments(p.tx, p.bills, p.now)) if (!p.dismissed.includes(r.key)) out.push({ kind: 'repeating', r });
  return out;
}

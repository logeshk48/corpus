// Turns detections into Home "Found for you" items (wired with actions in HomeScreen)
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { repeatingPayments, type Repeating } from './detect';

export type Finding = { kind: 'repeating'; r: Repeating };

export function findings(p: { tx: Transaction[]; bills: Bill[]; dismissed: string[]; now?: Date }): Finding[] {
  const out: Finding[] = [];
  for (const r of repeatingPayments(p.tx, p.bills, p.now)) if (!p.dismissed.includes(r.key)) out.push({ kind: 'repeating', r });
  return out;
}

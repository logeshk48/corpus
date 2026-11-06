// Turns detections into Home "Found for you" items (wired with actions in HomeScreen)
import type { Bill } from '@/types/bill';
import type { Transaction } from '@/types/transaction';
import { bigOneOffs, duplicates, hotCategories, repeatingPayments, salaryPattern, type Salary, type BigOne, type Duplicate, type HotCategory, type Repeating } from './detect';

export type Finding = { kind: 'repeating'; r: Repeating } | { kind: 'duplicate'; d: Duplicate } | { kind: 'hot'; h: HotCategory } | { kind: 'big'; b: BigOne } | { kind: 'payday'; s: Salary; suggest: number } | { kind: 'late'; s: Salary };

export function findings(p: { tx: Transaction[]; bills: Bill[]; dismissed: string[]; budgets?: Record<string, number>; cycleStartDay?: number; now?: Date }): Finding[] {
  const out: Finding[] = [];
  // double entries first: they make every other number wrong
  for (const d of duplicates(p.tx, p.now)) if (!p.dismissed.includes(d.key)) out.push({ kind: 'duplicate', d });
  // salary: start the month on pay day; salary not logged yet
  const sal = salaryPattern(p.tx, p.now);
  if (sal) {
    const now = p.now ?? new Date();
    const suggest = sal.day >= 29 ? 1 : sal.day; // pay on the 29th–31st funds the next month
    const cur = p.cycleStartDay ?? 1;
    const off = Math.min(Math.abs(cur - suggest), 31 - Math.abs(cur - suggest));
    if (off >= 2 && !p.dismissed.includes(`pay:${suggest}`)) out.push({ kind: 'payday', s: sal, suggest });
    const lateKey = `late:${now.getFullYear()}-${now.getMonth() + 1}`;
    if (!sal.receivedThisMonth && sal.lateBy >= 3 && sal.lateBy <= 12 && sal.day < 29 && !p.dismissed.includes(lateKey)) out.push({ kind: 'late', s: sal });
  }
  // a possible typo is next (also distorts everything), then this month's overspending
  for (const b of bigOneOffs(p.tx, p.now)) if (!p.dismissed.includes(b.key)) out.push({ kind: 'big', b });
  for (const h of hotCategories(p.tx, p.budgets ?? {}, p.cycleStartDay, p.now).slice(0, 2)) if (!p.dismissed.includes(h.key)) out.push({ kind: 'hot', h });
  for (const r of repeatingPayments(p.tx, p.bills, p.now)) if (!p.dismissed.includes(r.key)) out.push({ kind: 'repeating', r });
  return out;
}

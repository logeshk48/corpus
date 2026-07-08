import { Transaction } from '@/constants/mockTransactions';

export type TxSection = {
  title: string;
  data: Transaction[];
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function groupByDay(transactions: Transaction[]): TxSection[] {
  // newest first
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const sections: TxSection[] = [];
  for (const tx of sorted) {
    const label = dayLabel(tx.date);
    const last = sections[sections.length - 1];
    if (last && last.title === label) {
      last.data.push(tx);
    } else {
      sections.push({ title: label, data: [tx] });
    }
  }
  return sections;
}
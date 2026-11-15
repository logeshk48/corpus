import type { Transaction } from '@/types/transaction';

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Logging streak: how many days in a row you've logged something, ending today — or yesterday,
// so the streak doesn't look broken in the morning before your first entry.
export function loggingStreak(tx: Transaction[], now = new Date()) {
  const days = new Set(tx.map((t) => key(new Date(t.date))));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const loggedToday = days.has(key(d));
  if (!loggedToday) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(key(d))) { n++; d.setDate(d.getDate() - 1); }
  return { days: n, loggedToday };
}

import type { Transaction } from '@/types/transaction';

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ─── Catching up: the #1 reason people quit is missing days, then feeling behind ───
// No guilt, no streak: just "want to add the days you missed?"
export type CatchUp = { missedDays: number; lastLogged: Date | null; days: Date[] };

export function catchUp(tx: Transaction[], now = new Date(), maxDays = 7): CatchUp | null {
  const manual = tx.filter((t) => !t.recurringId);
  const last = manual.reduce<number | null>((m, t) => {
    const v = new Date(t.date).getTime();
    return m === null || v > m ? v : m;
  }, null);
  const today = startOfDay(now);
  // never logged anything → not a catch-up, that's onboarding
  if (last === null) return null;
  const lastDay = startOfDay(new Date(last));
  const missedDays = Math.round((today.getTime() - lastDay.getTime()) / DAY);
  if (missedDays < 2) return null;
  const days: Date[] = [];
  for (let i = 1; i <= Math.min(missedDays, maxDays); i++) days.push(new Date(today.getTime() - (missedDays - i) * DAY));
  return { missedDays, lastLogged: lastDay, days };
}

// Day chips for the Add screen: Today · Yesterday · Sat · Fri …
export function recentDays(now = new Date(), count = 4) {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getTime() - i * DAY);
    return { date: d, label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'short' }) };
  });
}

// Challenges: short goals Corpus checks on its own from what you log. Nothing to tick off by hand.
import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';
import type { ActiveChallenge, ChallengeKind } from '@/types/settings';
import type { VaultEntry } from '@/types/vault';
import type { PastelName } from '@/constants/theme';

export type DayMark = 'pass' | 'fail' | 'today' | 'ahead';
export type ChallengeState = {
  days: DayMark[];               // one mark per day (empty for money challenges)
  status: 'running' | 'won' | 'lost';
  progress: number;              // 0 to 1
  count: string;                 // "4/7", "₹600/₹1,000"
  line: string;                  // what's going on, in one sentence
  left: string;                  // "3 days left", "Ends today"
};
export type ChallengeInfo = { kind: ChallengeKind; title: (cat?: string) => string; blurb: string; icon: string; badge: string; tone: PastelName; length: string; level: 'Easy' | 'Medium' | 'Hard' };

export const CATALOG: ChallengeInfo[] = [
  { kind: 'under7', title: () => '7 days under budget', blurb: "Keep each day under your daily budget for a week.", icon: 'calendar', badge: 'Steady week', tone: 'mint', length: '7 days', level: 'Medium' },
  { kind: 'weekend', title: () => 'No-spend weekend', blurb: 'Spend nothing on Saturday and Sunday. Bills on autopay don’t count.', icon: 'sunny', badge: 'Zero weekend', tone: 'sky', length: '2 days', level: 'Medium' },
  { kind: 'skip7', title: (c) => `No ${c ? (findCategory('expense', c)?.label ?? c).toLowerCase() : 'shopping'} for 7 days`, blurb: 'Pick one thing to skip for a week.', icon: 'ban', badge: 'Skipped it', tone: 'rose', length: '7 days', level: 'Hard' },
  { kind: 'log7', title: () => 'Log every day for a week', blurb: 'One entry a day, even a small one. The habit that makes everything else work.', icon: 'create', badge: 'The Tracker', tone: 'lilac', length: '7 days', level: 'Easy' },
  { kind: 'jar1k', title: () => '₹1,000 into a jar', blurb: 'Put ₹1,000 into any jar within 14 days.', icon: 'file-tray-stacked', badge: 'First ₹1K', tone: 'butter', length: '14 days', level: 'Easy' },
];
export const infoOf = (k: ChallengeKind) => CATALOG.find((c) => c.kind === k)!;
export const SKIPPABLE = ['shopping', 'food', 'fun', 'travel'];

const DAY = 86_400_000;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => dayKey(new Date());

// The first Saturday on or after the start (started on a Sunday: the next weekend)
function weekendStart(start: Date) {
  const d = new Date(start);
  const wd = d.getDay();
  if (wd === 6) return d;
  d.setDate(d.getDate() + ((6 - wd + 7) % 7));
  return d;
}

export function challengeDays(c: ActiveChallenge): Date[] {
  const s = fromKey(c.start);
  if (c.kind === 'weekend') { const sat = weekendStart(s); return [sat, new Date(sat.getTime() + DAY)]; }
  if (c.kind === 'jar1k') return Array.from({ length: 14 }, (_, i) => new Date(s.getTime() + i * DAY));
  return Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
}

export function evaluate(c: ActiveChallenge, tx: Transaction[], jarEntries: VaultEntry[], dailyLimit: number, now = new Date()): ChallengeState {
  const days = challengeDays(c);
  const today = dayKey(now);
  const end = days[days.length - 1];
  const daysLeft = Math.max(0, Math.round((new Date(end.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / DAY));
  const left = daysLeft === 0 ? 'Ends today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;

  if (c.kind === 'jar1k') {
    const from = fromKey(c.start).getTime();
    const put = jarEntries.filter((e) => { const t = new Date(e.date).getTime(); return t >= from && t < end.getTime() + DAY; })
      .reduce((a, e) => a + (e.type === 'in' ? e.amount : -e.amount), 0);
    const got = Math.max(0, put);
    const won = got >= 1000;
    const over = dayKey(end) < today;
    return {
      days: [], progress: Math.min(1, got / 1000), count: `₹${Math.round(got).toLocaleString('en-IN')}/₹1,000`,
      status: won ? 'won' : over ? 'lost' : 'running',
      line: won ? 'Done. That money is working for a goal now.' : over ? `₹${Math.round(1000 - got).toLocaleString('en-IN')} short this time.` : `₹${Math.round(1000 - got).toLocaleString('en-IN')} to go.`,
      left: won ? 'Done' : over ? 'Ended' : left,
    };
  }

  const byDay = new Map<string, { spent: number; cat: number; entries: number }>();
  for (const t of tx) {
    const k = dayKey(new Date(t.date));
    const e = byDay.get(k) ?? { spent: 0, cat: 0, entries: 0 };
    e.entries += 1;
    if (t.type === 'expense' && !t.recurringId) {
      e.spent += t.amount;
      if (c.category && t.category === c.category) e.cat += t.amount;
    }
    byDay.set(k, e);
  }
  const ok = (k: string) => {
    const e = byDay.get(k) ?? { spent: 0, cat: 0, entries: 0 };
    if (c.kind === 'under7') return e.spent <= dailyLimit;
    if (c.kind === 'weekend') return e.spent === 0;
    if (c.kind === 'skip7') return e.cat === 0;
    return e.entries > 0; // log7
  };
  const marks: DayMark[] = days.map((d) => {
    const k = dayKey(d);
    if (k > today) return 'ahead';
    if (k === today) return c.kind === 'log7' ? (ok(k) ? 'pass' : 'today') : ok(k) ? 'today' : 'fail';
    return ok(k) ? 'pass' : 'fail';
  });
  const passed = marks.filter((m) => m === 'pass').length;
  const lost = marks.includes('fail');
  const won = !lost && (dayKey(end) < today || (c.kind === 'log7' && marks.every((m) => m === 'pass')));
  const shown = won ? days.length : passed;
  const limit = `₹${Math.round(dailyLimit).toLocaleString('en-IN')}`;
  const line = won ? 'You did it.'
    : lost ? (c.kind === 'under7' ? `One day went over ${limit}. Start again any time.` : c.kind === 'weekend' ? 'Something got spent this weekend. Next one?' : c.kind === 'skip7' ? 'It slipped in. Start again any time.' : 'A day went by without an entry. Start again any time.')
    : marks[0] === 'ahead' ? (c.kind === 'weekend' ? `Starts Saturday ${days[0].getDate()} ${days[0].toLocaleDateString('en-IN', { month: 'short' })}.` : 'Starts tomorrow.')
    : c.kind === 'under7' ? `Stay under ${limit} today.`
    : c.kind === 'weekend' ? 'Nothing spent so far. Keep it that way.'
    : c.kind === 'skip7' ? 'None so far. Keep going.'
    : marks.includes('today') ? 'Log something today to keep it going.' : 'Today is logged.';
  return { days: marks, status: won ? 'won' : lost ? 'lost' : 'running', progress: shown / days.length, count: `${shown}/${days.length}`, line, left: won ? 'Done' : lost ? 'Missed' : left };
}

// The daily budget a challenge measures against: your monthly budget split over the month's days,
// else what a usual day has cost over the last 30 days
export function dailyLimitFor(tx: Transaction[], monthlyBudget?: number, now = new Date()) {
  if (monthlyBudget) return monthlyBudget / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const since = now.getTime() - 30 * DAY;
  const spent = tx.filter((t) => t.type === 'expense' && !t.recurringId && new Date(t.date).getTime() >= since).reduce((a, t) => a + t.amount, 0);
  return Math.max(100, Math.round(spent / 30));
}

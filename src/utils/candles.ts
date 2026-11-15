import type { Transaction } from '@/types/transaction';
import type { AccountBalance } from '@/utils/accounts';

// ─── "Your money" candles ───
// Rebuilds the money you had (cash + bank + wallet) going back in time from today's balances,
// undoing each logged entry. One candle per day or week: open → close, with the high and low in between.
// Green = the period ended higher, red = lower. Approximate: balance corrections at check-ins aren't replayed.

export type Candle = { start: Date; open: number; close: number; high: number; low: number; moves: number };
export type CandleRange = 'days' | 'weeks';

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY); // Monday
};

function firstSeen(a: AccountBalance, tx: Transaction[]) {
  const dates = [a.openingDate, ...(a.checkins ?? []).map((c) => c.date), ...tx.filter((t) => t.accountId === a.id).map((t) => t.date)];
  return Math.min(...dates.map((d) => new Date(d).getTime()).filter((n) => !isNaN(n)));
}

// Balance series for a set of accounts (money accounts only)
export function moneyCandles(accounts: AccountBalance[], tx: Transaction[], range: CandleRange, count = range === 'days' ? 14 : 12, now = new Date()): Candle[] {
  const money = accounts.filter((a) => a.type !== 'credit' && !a.archived);
  if (!money.length) return [];
  const ids = new Set(money.map((a) => a.id));
  const since = Math.min(...money.map((a) => firstSeen(a, tx)));
  const events = tx
    .filter((t) => t.accountId && ids.has(t.accountId) && new Date(t.date).getTime() <= now.getTime())
    .map((t) => ({ at: new Date(t.date).getTime(), effect: t.type === 'income' ? t.amount : -t.amount }))
    .sort((a, b) => b.at - a.at);

  const starts: Date[] = [];
  let s = range === 'days' ? startOfDay(now) : startOfWeek(now);
  for (let i = 0; i < count; i++) {
    starts.unshift(s);
    s = range === 'days' ? new Date(s.getTime() - DAY) : new Date(s.getTime() - 7 * DAY);
  }

  let cur = money.reduce((sum, a) => sum + a.balance, 0);
  let e = 0;
  const out: Candle[] = [];
  for (let i = starts.length - 1; i >= 0; i--) {
    const from = starts[i].getTime();
    const close = cur;
    let high = cur, low = cur, moves = 0;
    while (e < events.length && events[e].at >= from) {
      cur -= events[e].effect;
      high = Math.max(high, cur);
      low = Math.min(low, cur);
      moves++;
      e++;
    }
    const end = i === starts.length - 1 ? now.getTime() : starts[i + 1].getTime();
    if (end <= since) break; // before you started tracking
    out.unshift({ start: starts[i], open: cur, close, high, low, moves });
  }
  return out.map((c) => ({ ...c, open: r(c.open), close: r(c.close), high: r(c.high), low: r(c.low) }));
}

// Daily closing balance of one account for a sparkline (oldest first)
export function accountSpark(a: AccountBalance, tx: Transaction[], days = 14, now = new Date()): number[] {
  const events = tx
    .filter((t) => t.accountId === a.id && new Date(t.date).getTime() <= now.getTime())
    .map((t) => ({ at: new Date(t.date).getTime(), effect: (t.type === 'income' ? 1 : -1) * (a.type === 'credit' ? -1 : 1) * t.amount }))
    .sort((x, y) => y.at - x.at);
  const since = firstSeen(a, tx);
  let cur = a.balance, e = 0;
  const out: number[] = [];
  let dayStart = startOfDay(now).getTime();
  for (let i = 0; i < days; i++) {
    out.unshift(cur);
    while (e < events.length && events[e].at >= dayStart) { cur -= events[e].effect; e++; }
    if (dayStart <= since) break;
    dayStart -= DAY;
  }
  return out;
}

const r = (n: number) => Math.round(n * 100) / 100;

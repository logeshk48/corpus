import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';
import { daysIn, shiftMonth, ym } from './analytics';

const isExp = (t: Transaction) => t.type === 'expense';
const inMonth = (t: Transaction, key: string) => ym(new Date(t.date)) === key;

// Where the month is heading. One big spend (rent, a phone) is counted once, not spread over every day left.
export function monthPace(tx: Transaction[], key: string, budget?: number, now = new Date()) {
  const isCurrent = key === ym(now);
  const days = daysIn(key);
  const day = isCurrent ? now.getDate() : days;
  const list = tx.filter((t) => isExp(t) && inMonth(t, key)).map((t) => t.amount).sort((a, b) => b - a);
  const spent = list.reduce((a, b) => a + b, 0);
  const big = list[0] ?? 0;
  const daily = day > 0 ? (big > spent * 0.3 ? spent - big : spent) / day : 0;
  const projected = isCurrent ? Math.round(spent + daily * (days - day)) : spent;
  const left = budget ? budget - spent : null;
  const perDayLeft = budget && isCurrent && days - day + 1 > 0 ? Math.max(0, (budget - spent) / (days - day + 1)) : null;
  return { isCurrent, day, days, spent, projected, daily, budget, left, perDayLeft };
}

// Which days of the week cost the most, over the last 3 months (each weekday averaged over how often it came round)
export function weekdayPattern(tx: Transaction[], now = new Date(), months = 3) {
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const sums = new Array(7).fill(0);
  const seen = new Array(7).fill(0);
  const cats = Array.from({ length: 7 }, () => new Map<string, number>());
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) seen[(d.getDay() + 6) % 7] += 1;
  for (const t of tx) {
    if (!isExp(t)) continue;
    const d = new Date(t.date);
    if (d < start || d > now) continue;
    const w = (d.getDay() + 6) % 7;
    sums[w] += t.amount;
    cats[w].set(t.category, (cats[w].get(t.category) ?? 0) + t.amount);
  }
  const avg = sums.map((s, i) => (seen[i] ? s / seen[i] : 0));
  const top = avg.indexOf(Math.max(...avg));
  const low = avg.indexOf(Math.min(...avg));
  const overall = sums.reduce((a, b) => a + b, 0) / Math.max(1, seen.reduce((a, b) => a + b, 0));
  // what each weekday's money mostly goes on
  const mainly = cats.map((m, i) => {
    const [id, amt] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return id ? { id, label: findCategory('expense', id)?.label ?? 'Other', share: sums[i] ? (amt as number) / sums[i] : 0 } : null;
  });
  return { avg, top, low, overall, mainly };
}
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Many little spends (tea, auto, snacks) add up without being noticed
export function smallSpends(tx: Transaction[], key: string, under = 200) {
  const list = tx.filter((t) => isExp(t) && inMonth(t, key) && t.amount < under).sort((a, b) => +new Date(a.date) - +new Date(b.date));
  return { count: list.length, total: list.reduce((a, t) => a + t.amount, 0), under, list };
}

// Categories that moved the most against your usual (the 3 months before), counted over the same days
export function categoryMovers(tx: Transaction[], key: string, now = new Date()) {
  const isCurrent = key === ym(now);
  const upTo = isCurrent ? now.getDate() : 31;
  const sum = (k: string) => {
    const m = new Map<string, number>();
    for (const t of tx) if (isExp(t) && inMonth(t, k) && new Date(t.date).getDate() <= upTo) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return m;
  };
  const cur = sum(key);
  const past = [1, 2, 3].map((n) => sum(shiftMonth(key, -n)));
  const ids = new Set([...cur.keys(), ...past.flatMap((p) => [...p.keys()])]);
  const rows = [...ids].map((id) => {
    const usual = past.reduce((a, p) => a + (p.get(id) ?? 0), 0) / 3;
    const now_ = cur.get(id) ?? 0;
    return { id, label: findCategory('expense', id)?.label ?? 'Other', now: now_, usual, diff: now_ - usual };
  }).filter((r) => Math.abs(r.diff) >= 300 && (r.usual > 0 || r.now > 0));
  const up = rows.filter((r) => r.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
  const down = rows.filter((r) => r.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 3);
  return { up, down };
}

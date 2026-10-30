// Splits, bonus issues and dividends for stock holdings — applied automatically.
//
// Splits/bonus: when a company splits 1→5, the exchange price drops to 1/5 and you get 5× the shares.
// We multiply units and divide the buy price of every lot. Only splits AFTER `eventsFrom` are applied,
// because quantities you typed in (from your broker) are already adjusted for older splits.
//
// Dividends: each payout × the shares you held before the ex-date. Stored on the holding, so they
// stay in your returns even after you sell.
import type { Dividend, Investment, Lot } from '@/types/investment';
import type { Events } from './market';

export const lotsOf = (h: Investment): Lot[] =>
  h.lots?.length ? h.lots : h.units ? [{ date: h.startDate, units: h.units, price: h.invested / h.units }] : [];

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;

export function applyEvents(h: Investment, ev: Events, now = new Date()): Partial<Investment> | null {
  const nowIso = now.toISOString();
  let lots = lotsOf(h);
  if (!lots.length) return { eventsAt: nowIso, eventsFrom: h.eventsFrom ?? nowIso };
  const changes: Partial<Investment> = { eventsAt: nowIso };
  const base = h.eventsFrom;
  if (!base) changes.eventsFrom = nowIso; // first check: today's quantities are the truth

  // 1) splits / bonus after the baseline
  const done = new Set((h.actions ?? []).map((a) => a.date.slice(0, 10)));
  const newSplits = base ? ev.splits.filter((s) => s.date > base && s.ratio > 0 && s.ratio !== 1 && !done.has(s.date.slice(0, 10))) : [];
  let units = h.units ?? 0;
  for (const s of newSplits) {
    lots = lots.map((l) => (l.date < s.date ? { ...l, units: r4(l.units * s.ratio), price: l.price / s.ratio } : l));
    units = r4(lots.reduce((a, l) => a + l.units, 0));
  }
  if (newSplits.length) {
    changes.lots = lots;
    changes.units = units;
    changes.actions = [...(h.actions ?? []), ...newSplits];
  }

  // 2) dividends since the first purchase
  const have = new Set((h.dividends ?? []).map((d) => d.date.slice(0, 10)));
  const first = lots.reduce((a, l) => (l.date < a ? l.date : a), lots[0].date);
  const added: Dividend[] = [];
  for (const d of ev.dividends) {
    if (d.date <= first || have.has(d.date.slice(0, 10))) continue;
    const held = r4(lots.filter((l) => l.date < d.date).reduce((a, l) => a + l.units, 0));
    if (held > 0) added.push({ date: d.date, perShare: d.amount, units: held, amount: Math.round(d.amount * held * 100) / 100 });
  }
  if (added.length) changes.dividends = [...(h.dividends ?? []), ...added].sort((a, b) => (a.date < b.date ? -1 : 1));
  return changes;
}

export const dividendTotal = (h: Investment) => Math.round((h.dividends ?? []).reduce((a, d) => a + d.amount, 0));

// Indian financial year (Apr–Mar): "2026-27"
export function fyOf(d: Date | string) {
  const x = new Date(d);
  const y = x.getMonth() >= 3 ? x.getFullYear() : x.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}
export const fyStart = (now = new Date()) => new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 1);

// Savings-rate trend (12 months) and idle cash.
import type { MonthFlow } from './wealthScore';

export type RateMonth = MonthFlow & { rate: number | null };

export function savingsTrend(flows: MonthFlow[]) {
  const months: RateMonth[] = flows.map((m) => ({ ...m, rate: m.income > 0 ? (m.income - m.spend) / m.income : null }));
  const done = months.slice(0, -1).filter((m) => m.rate != null); // complete months with income
  const avg = done.length ? done.reduce((a, m) => a + m.rate!, 0) / done.length : null;
  const last3 = done.slice(-3), prev3 = done.slice(-6, -3);
  const mean = (l: RateMonth[]) => (l.length ? l.reduce((a, m) => a + m.rate!, 0) / l.length : null);
  const recent = mean(last3), before = mean(prev3);
  const best = done.length ? done.reduce((b, m) => (m.rate! > b.rate! ? m : b)) : null;
  const negative = done.filter((m) => m.rate! < 0).length;
  const savedTotal = done.reduce((a, m) => a + (m.income - m.spend), 0);
  return { months, avg, recent, before, change: recent != null && before != null ? recent - before : null, best, negative, savedTotal, count: done.length };
}

export const SAVINGS_ACCOUNT_RATE = 2.7; // big banks pay ~2.5–3% on savings accounts

// Money in the bank beyond what you need there. Rule of thumb (used by most planners):
// keep ~2 months of spending + upcoming bills/card dues in the bank; the rest of your emergency
// fund and extra cash earns more in a liquid fund (≈ FD returns, money back in 1 day).
export function idleCash(p: { cash: number; monthlyNeed: number; billsDue30: number; cardDues: number; liquidRate: number }) {
  const keep = Math.round(2 * p.monthlyNeed + p.billsDue30 + p.cardDues);
  const idle = Math.max(0, Math.round(p.cash - keep));
  const extraPerYear = Math.round((idle * (p.liquidRate - SAVINGS_ACCOUNT_RATE)) / 100);
  return { keep, idle, extraPerYear, show: idle >= 20_000 && extraPerYear >= 500 };
}

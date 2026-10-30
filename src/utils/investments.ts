import { investMeta, type Investment } from '@/types/investment';

const DAY = 86_400_000;
const YEAR = 365 * DAY; // banks count actual days / 365

// ─── What an investment is worth today ───
// FD: compounds quarterly from the start (most Indian banks), stops growing at maturity.
// EPF / PPF: interest builds up daily even though it's credited once a year, so we
// add it as it accrues — no fake jump when the yearly credit lands.
// Everything else: the value you last entered (marked manual / stale).
export function currentValue(h: Investment, at = new Date()): { value: number; auto: boolean } {
  const t = at.getTime();
  if (h.type === 'fd' && h.rate) {
    const end = h.maturityDate ? Math.min(t, new Date(h.maturityDate).getTime()) : t;
    const years = Math.max(0, (end - new Date(h.startDate).getTime()) / YEAR);
    return { value: Math.round(h.invested * Math.pow(1 + h.rate / 400, years * 4)), auto: true };
  }
  if ((h.type === 'epf' || h.type === 'ppf') && h.rate) {
    const years = Math.max(0, (t - new Date(h.valueAt).getTime()) / YEAR);
    return { value: Math.round(h.value * (1 + (h.rate / 100) * years)), auto: true };
  }
  return { value: h.value, auto: false };
}

export const daysOld = (h: Investment, at = new Date()) => Math.floor((at.getTime() - new Date(h.valueAt).getTime()) / DAY);
// market values go stale fast; fixed-rate ones don't
export const isStale = (h: Investment, at = new Date()) => !['fd', 'epf', 'ppf'].includes(h.type) && daysOld(h, at) > 45;

export function gain(h: Investment, at = new Date()) {
  const v = currentValue(h, at).value;
  const g = v - h.invested;
  return { value: v, gain: g, pct: h.invested > 0 ? (g / h.invested) * 100 : 0 };
}

// Rough yearly return (CAGR) — only meaningful after ~1 year
export function yearlyReturn(h: Investment, at = new Date()) {
  const years = (at.getTime() - new Date(h.startDate).getTime()) / YEAR;
  const v = currentValue(h, at).value;
  if (years < 1 || h.invested <= 0 || v <= 0) return null;
  return (Math.pow(v / h.invested, 1 / years) - 1) * 100;
}

export function portfolio(list: Investment[], at = new Date()) {
  let invested = 0, value = 0;
  const byCls = new Map<string, number>();
  for (const h of list) {
    const v = currentValue(h, at).value;
    invested += h.invested;
    value += v;
    const c = investMeta(h.type).cls;
    byCls.set(c, (byCls.get(c) ?? 0) + v);
  }
  const allocation = [...byCls.entries()].map(([cls, v]) => ({ cls, value: v, share: value ? v / value : 0 })).sort((a, b) => b.value - a.value);
  return { invested, value, gain: value - invested, pct: invested ? ((value - invested) / invested) * 100 : 0, allocation };
}

// Monthly check-up: holdings without a live price or automatic growth, not updated for 30+ days
export const needsCheckup = (h: Investment, at = new Date()) => {
  const live = !!h.units && !!(h.symbol || h.schemeCode || h.npsCode || h.coinId);
  return !live && !currentValue(h, at).auto && daysOld(h, at) >= 30 && h.value > 0;
};

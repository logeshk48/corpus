// XIRR: the yearly return that accounts for WHEN each rupee went in — what Groww / Kuvera show.
// Cash you put in is negative, today's value is positive.
import type { Investment } from '@/types/investment';
import { lotsOf } from './corporateActions';

export type Flow = { t: Date; a: number };
const YEAR = 365 * 86_400_000;

export function xirr(flows: Flow[]): number | null {
  if (flows.length < 2 || !flows.some((f) => f.a < 0) || !flows.some((f) => f.a > 0)) return null;
  const t0 = Math.min(...flows.map((f) => f.t.getTime()));
  const span = (Math.max(...flows.map((f) => f.t.getTime())) - t0) / YEAR;
  if (span < 30 / 365) return null; // under a month: annualising is meaningless
  const npv = (r: number) => flows.reduce((s, f) => s + f.a / Math.pow(1 + r, (f.t.getTime() - t0) / YEAR), 0);
  let lo = -0.9999, hi = 10;
  let fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const f = npv(mid);
    if (Math.abs(f) < 0.01) return mid * 100;
    if (f * fLo < 0) (hi = mid), (fHi = f);
    else (lo = mid), (fLo = f);
  }
  return ((lo + hi) / 2) * 100;
}

// Flows for one holding: each purchase (lot) out, today's value (+ dividends received) in
export function holdingFlows(h: Investment, value: number, at = new Date()): Flow[] {
  const lots = lotsOf(h);
  const flows: Flow[] = lots.length ? lots.map((l) => ({ t: new Date(l.date), a: -l.units * l.price })) : [{ t: new Date(h.startDate), a: -h.invested }];
  for (const d of h.dividends ?? []) flows.push({ t: new Date(d.date), a: d.amount });
  flows.push({ t: at, a: value });
  return flows;
}
export const holdingXirr = (h: Investment, value: number, at = new Date()) => xirr(holdingFlows(h, value, at));
export function portfolioXirr(list: { h: Investment; value: number }[], at = new Date()) {
  const flows: Flow[] = [];
  for (const { h, value } of list) flows.push(...holdingFlows(h, value, at));
  return xirr(flows);
}

// ─── Goals: will I get there? ───
// Expected yearly returns used for projections (long-run Indian averages, kept modest)
export const EXPECTED: Record<string, number> = { equity: 12, debt: 7, retirement: 8, gold: 8, crypto: 0, other: 6 };

export function futureValue(pv: number, monthly: number, yearlyPct: number, months: number) {
  const r = Math.pow(1 + yearlyPct / 100, 1 / 12) - 1;
  if (months <= 0) return pv;
  if (r === 0) return pv + monthly * months;
  const g = Math.pow(1 + r, months);
  return pv * g + monthly * ((g - 1) / r);
}
// Monthly SIP needed to reach `target` in `months`
export function sipNeeded(target: number, pv: number, yearlyPct: number, months: number) {
  if (months <= 0) return Math.max(0, target - pv);
  const r = Math.pow(1 + yearlyPct / 100, 1 / 12) - 1;
  const g = Math.pow(1 + r, months);
  const gap = target - pv * g;
  if (gap <= 0) return 0;
  return r === 0 ? gap / months : (gap * r) / (g - 1);
}
export const monthsUntil = (iso: string, now = new Date()) => {
  const d = new Date(iso);
  return Math.max(0, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
};

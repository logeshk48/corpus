// Rough capital-gains tax if you sold today — Indian rules from 23 Jul 2024 (unchanged in Budget 2026).
// • Listed shares, equity funds, equity ETFs: short-term (≤ 12 months) 20%; long-term 12.5% on gains
//   above ₹1.25 lakh a year (the exemption is shared across all equity).
// • Gold ETFs & listed SGBs: long-term after 12 months, 12.5%; short-term at your slab.
// • Gold / other funds (FoFs, hybrids with < 65% equity): long-term after 24 months, 12.5%; short-term at slab.
// • Debt funds bought after 1 Apr 2023: always your slab rate.
// • Crypto: flat 30%, losses can't be set off.
// • 4% cess on top. NPS, EPF, PPF, FDs aren't covered (FD interest is taxed yearly at slab).
import type { Investment, Lot } from '@/types/investment';

export const LTCG_EXEMPTION = 125_000;
const CESS = 1.04;
const DAY = 86_400_000;

export type TaxClass = 'equity' | 'gold-listed' | 'gold-fund' | 'debt' | 'other-fund' | 'crypto';
export function taxClass(h: Investment): TaxClass | null {
  if (h.type === 'crypto') return 'crypto';
  if (h.type === 'stock') return 'equity';
  if (h.type === 'goldbond') return h.symbol ? 'gold-listed' : 'gold-fund';
  if (h.type === 'mf') {
    const c = h.fundClass ?? 'equity';
    return c === 'equity' ? 'equity' : c === 'debt' ? 'debt' : c === 'gold' ? 'gold-fund' : 'other-fund';
  }
  return null;
}
const LONG_AFTER: Record<TaxClass, number | null> = { equity: 365, 'gold-listed': 365, 'gold-fund': 730, 'other-fund': 730, debt: null, crypto: null };
export const longAfterDays = (c: TaxClass) => LONG_AFTER[c];
export const CLASS_LABEL: Record<TaxClass, string> = {
  equity: 'Equity', 'gold-listed': 'Gold ETF / SGB', 'gold-fund': 'Gold fund', 'other-fund': 'Hybrid / other fund', debt: 'Debt fund', crypto: 'Crypto',
};

const lotsFor = (h: Investment): Lot[] =>
  h.lots?.length ? h.lots : h.units ? [{ date: h.startDate, units: h.units, price: h.invested / h.units }] : [{ date: h.startDate, units: 1, price: h.invested }];

export type HoldingTax = {
  cls: TaxClass;
  shortGain: number;       // gain on lots still short-term
  longGain: number;        // gain on long-term lots
  turnsLongOn: string | null; // the next short-term lot to become long-term
  waitSaves: number | null;   // tax saved by waiting till then (rough)
};

export function holdingTax(h: Investment, at = new Date()): HoldingTax | null {
  const cls = taxClass(h);
  if (!cls) return null;
  const lots = lotsFor(h);
  const unitPrice = h.units ? h.value / h.units : h.value; // live-applied value
  const after = LONG_AFTER[cls];
  let shortGain = 0, longGain = 0, next: string | null = null, nextGain = 0;
  for (const l of lots) {
    const g = (unitPrice - l.price) * l.units;
    const age = (at.getTime() - new Date(l.date).getTime()) / DAY;
    if (after != null && age > after) longGain += g;
    else {
      shortGain += g;
      if (after != null) {
        const d = new Date(new Date(l.date).getTime() + (after + 1) * DAY).toISOString();
        if (!next || d < next) (next = d), (nextGain = g);
      }
    }
  }
  // waiting helps only for gains, and only where short-term is taxed higher than long-term
  const stRate = cls === 'equity' ? 0.2 : 0.3; // slab assumed ~30% for the estimate
  const waitSaves = next && nextGain > 0 ? Math.round(nextGain * (stRate - 0.125) * CESS) : null;
  return { cls, shortGain: Math.round(shortGain), longGain: Math.round(longGain), turnsLongOn: next, waitSaves };
}

export type TaxSummary = {
  equityShort: number; equityLong: number; exemptionLeft: number;
  otherLong: number; slabGains: number; crypto: number;
  estimate: number;        // tax (with cess) if everything sold today; slab gains at 30%
  hasSlab: boolean;
};
export function portfolioTax(list: Investment[], at = new Date(), exemptionUsed = 0): TaxSummary {
  let eS = 0, eL = 0, oL = 0, slab = 0, crypto = 0;
  for (const h of list) {
    const t = holdingTax(h, at);
    if (!t) continue;
    if (t.cls === 'equity') (eS += t.shortGain), (eL += t.longGain);
    else if (t.cls === 'crypto') crypto += Math.max(0, t.shortGain + t.longGain);
    else if (t.cls === 'debt') slab += t.shortGain + t.longGain;
    else (oL += t.longGain), (slab += t.shortGain);
  }
  // short-term losses can offset long-term gains; long-term losses only long-term gains
  if (eS < 0) (eL += eS), (eS = 0);
  const exemptionLeft = Math.max(0, LTCG_EXEMPTION - exemptionUsed);
  const taxableLong = Math.max(0, eL - exemptionLeft) + Math.max(0, oL);
  const estimate = Math.round((eS * 0.2 + taxableLong * 0.125 + Math.max(0, slab) * 0.3 + crypto * 0.3) * CESS);
  return { equityShort: eS, equityLong: eL, exemptionLeft, otherLong: oL, slabGains: slab, crypto, estimate, hasSlab: slab > 0 };
}

// ─── Gains you already booked this financial year ───
type Sale = { cls: string; date: string; shortGain: number; longGain: number };
export function bookedThisYear(sales: Sale[], fyStartDate: Date) {
  let eS = 0, eL = 0, oL = 0, slab = 0, crypto = 0, count = 0;
  for (const s of sales) {
    if (new Date(s.date) < fyStartDate) continue;
    count++;
    if (s.cls === 'equity') (eS += s.shortGain), (eL += s.longGain);
    else if (s.cls === 'crypto') crypto += Math.max(0, s.shortGain + s.longGain); // crypto losses can't be set off
    else if (s.cls === 'debt' || s.cls === 'other') slab += s.shortGain + s.longGain;
    else (oL += s.longGain), (slab += s.shortGain);
  }
  // short-term equity loss can be set off against long-term gains
  const setOffS = eS < 0 ? eS : 0;
  const longNet = eL + setOffS;
  const shortNet = Math.max(0, eS);
  const exemptionUsed = Math.min(LTCG_EXEMPTION, Math.max(0, longNet));
  const tax = Math.round((shortNet * 0.2 + Math.max(0, longNet - LTCG_EXEMPTION) * 0.125 + Math.max(0, oL) * 0.125 + Math.max(0, slab) * 0.3 + crypto * 0.3) * CESS);
  return { count, equityShort: eS, equityLong: eL, otherLong: oL, slab, crypto, exemptionUsed, exemptionLeft: LTCG_EXEMPTION - exemptionUsed, tax, total: eS + eL + oL + slab + crypto };
}

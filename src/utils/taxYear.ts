// Tax year report — what you'll need for your ITR, from what's already in Corpus.
// Rules for tax year 2026-27 (Income-tax Act 2025, in force from 1 April 2026; Budget 2026 left these rates unchanged):
//  • New regime is the default — most deductions below only matter if you choose the OLD regime.
//  • Equity (shares, equity funds): short-term (≤ 12 months) 20%; long-term 12.5% above ₹1.25 lakh a year.
//  • Old-regime deductions: Section 123 (was 80C) up to ₹1.5 lakh — PPF, ELSS, life insurance, home-loan principal,
//    children's tuition; health insurance (was 80D); NPS extra ₹50,000 (was 80CCD(1B)); home-loan interest up to ₹2 lakh
//    for a self-occupied home (was 24(b)).
// A guide to gather your numbers, not tax advice.
import type { Bill } from '@/types/bill';
import type { Investment } from '@/types/investment';
import type { Realized } from '@/types/realized';
import type { Transaction } from '@/types/transaction';
import { LTCG_EXEMPTION } from './capitalGains';
import { buildSchedule } from './loan';

export const SEC123_LIMIT = 150_000;
export const NPS_EXTRA_LIMIT = 50_000;
export const HOME_INTEREST_LIMIT = 200_000;

const inRange = (iso: string, start: Date, end: Date) => {
  const d = new Date(iso);
  return d >= start && d < end;
};
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export type TaxItem = { label: string; amount: number; note?: string; date?: string };

export function taxYearReport(p: { start: Date; end: Date; realized: Realized[]; investments: Investment[]; bills: Bill[]; tx: Transaction[] }) {
  const { start, end } = p;
  // ── Capital gains booked (Schedule CG) ──
  const sales = p.realized.filter((r) => inRange(r.date, start, end));
  const eqShort = sales.filter((r) => r.cls === 'equity').reduce((a, r) => a + r.shortGain, 0);
  const eqLong = sales.filter((r) => r.cls === 'equity').reduce((a, r) => a + r.longGain, 0);
  const otherLong = sales.filter((r) => r.cls !== 'equity' && r.cls !== 'debt' && r.cls !== 'crypto').reduce((a, r) => a + r.longGain, 0);
  const slabGains = sales.filter((r) => r.cls === 'debt' || (r.cls !== 'equity' && r.cls !== 'crypto')).reduce((a, r) => a + (r.cls === 'debt' ? r.shortGain + r.longGain : r.shortGain), 0);
  const crypto = sales.filter((r) => r.cls === 'crypto').reduce((a, r) => a + r.shortGain + r.longGain, 0);
  const taxableLtcg = Math.max(0, eqLong - LTCG_EXEMPTION);

  // ── Dividends received (taxed at your slab; listed under "other sources") ──
  const dividends: TaxItem[] = [];
  for (const h of p.investments) for (const d of h.dividends ?? []) if (inRange(d.date, start, end)) dividends.push({ label: h.name, amount: Math.round(d.amount), date: d.date });

  // ── FD interest earned this year (taxable at slab even if not paid out yet) ──
  const fdInterest: TaxItem[] = [];
  for (const h of p.investments) {
    if (h.type !== 'fd' || !h.rate) continue;
    const g = (t: number) => {
      const end2 = h.maturityDate ? Math.min(t, new Date(h.maturityDate).getTime()) : t;
      const yrs = Math.max(0, (end2 - new Date(h.startDate).getTime()) / (365 * 86_400_000));
      return h.invested * Math.pow(1 + h.rate! / 400, yrs * 4);
    };
    const earned = g(Math.min(end.getTime(), Date.now())) - g(start.getTime());
    if (earned > 0) fdInterest.push({ label: h.name, amount: Math.round(earned), note: `${h.rate}% a year` });
  }

  // ── Old-regime deductions found in your data ──
  const s123: TaxItem[] = [];
  // ELSS purchases (tax-saver funds) this year
  for (const h of p.investments) {
    if (h.type !== 'mf' || !/elss|tax\s*saver|tax\s*saving/i.test(h.name)) continue;
    const put = (h.lots ?? []).filter((l) => inRange(l.date, start, end)).reduce((a, l) => a + l.units * l.price, 0);
    if (put > 0) s123.push({ label: `${h.name} (ELSS)`, amount: Math.round(put) });
  }
  // payments you logged with a tell-tale note
  const notes = (re: RegExp, cats?: string[]) =>
    p.tx.filter((t) => t.type === 'expense' && inRange(t.date, start, end) && re.test(t.note ?? '') && (!cats || cats.includes(t.category)));
  const lic = notes(/\b(lic|life insurance|term (plan|insurance)|jeevan)\b/i);
  if (lic.length) s123.push({ label: 'Life insurance premiums', amount: lic.reduce((a, t) => a + t.amount, 0), note: `${lic.length} payment${lic.length > 1 ? 's' : ''} found by note` });
  const ppf = notes(/\b(ppf|sukanya|ssy|nsc)\b/i);
  if (ppf.length) s123.push({ label: 'PPF / Sukanya / NSC deposits', amount: ppf.reduce((a, t) => a + t.amount, 0), note: 'found by note' });
  const tuition = notes(/\b(tuition|school fee|school fees|college fee)\b/i);
  if (tuition.length) s123.push({ label: 'Children’s tuition fees', amount: tuition.reduce((a, t) => a + t.amount, 0), note: 'only tuition counts, not transport or books' });
  const health = notes(/\b(health insurance|mediclaim|medical insurance|star health|care health|niva bupa)\b/i);
  const nps = p.investments.filter((h) => h.type === 'nps').reduce((a, h) => a + (h.lots ?? []).filter((l) => inRange(l.date, start, end)).reduce((s, l) => s + l.units * l.price, 0), 0);

  // home loans: principal (Section 123) and interest (up to ₹2 lakh) paid this year
  let homePrincipal = 0, homeInterest = 0;
  const homeLoans: string[] = [];
  for (const b of p.bills) {
    if (!b.loan || b.loan.type !== 'home') continue;
    const rows = buildSchedule(b.loan).filter((r) => r.month >= ym(start) && r.month < ym(end) && r.month <= ym(new Date()));
    homePrincipal += rows.reduce((a, r) => a + r.principal + r.prepayment, 0);
    homeInterest += rows.reduce((a, r) => a + r.interest, 0);
    homeLoans.push(b.name);
  }
  if (homePrincipal > 0) s123.push({ label: 'Home loan principal repaid', amount: Math.round(homePrincipal), note: homeLoans.join(', ') });

  const s123Total = s123.reduce((a, i) => a + i.amount, 0);
  return {
    sales, eqShort, eqLong, otherLong, slabGains, crypto, taxableLtcg, exemptionUsed: Math.min(LTCG_EXEMPTION, Math.max(0, eqLong)),
    dividends, dividendTotal: dividends.reduce((a, d) => a + d.amount, 0),
    fdInterest, fdTotal: fdInterest.reduce((a, d) => a + d.amount, 0),
    s123, s123Total, s123Room: Math.max(0, SEC123_LIMIT - s123Total),
    healthPremiums: health.reduce((a, t) => a + t.amount, 0),
    npsExtra: Math.min(NPS_EXTRA_LIMIT, Math.round(nps)), npsPut: Math.round(nps),
    homeInterest: Math.round(homeInterest), homeInterestAllowed: Math.min(HOME_INTEREST_LIMIT, Math.round(homeInterest)),
  };
}

import type { Account } from '@/types/account';
import type { ManualAsset } from '@/types/asset';
import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import { isLoan } from './iou';
import { loanStatus } from './loan';

// ─── Net worth = what you own − what you owe, at a moment in time ───
// Built from BALANCES, never by adding up transactions. Things that never change it:
// moving money into jars (they live inside your bank balance), paying a card bill,
// transfers between your own accounts, lending money and getting it back.

const DAY = 86_400_000;
export type Confidence = 'verified' | 'manual' | 'estimated' | 'stale';
export type NwGroup = 'cash' | 'receivable' | 'home' | 'property' | 'vehicle' | 'gold' | 'other' | 'card' | 'loan' | 'homeLoan' | 'people';

export type NwItem = {
  id: string;
  label: string;
  side: 'asset' | 'liability';
  group: NwGroup;
  value: number;
  liquid: boolean;          // could you use it this month?
  confidence: Confidence;
  note?: string;            // "verified 3 days ago", "60% counted, 7 months overdue"
  link?: string;            // where to fix it in the app
};

const daysSince = (iso: string | undefined, at: Date) => (iso ? Math.floor((at.getTime() - new Date(iso).getTime()) / DAY) : 9999);
const freshness = (iso: string | undefined, at: Date, staleAfter: number): { confidence: Confidence; note: string } => {
  const d = daysSince(iso, at);
  const note = d <= 0 ? 'updated today' : d === 1 ? 'updated yesterday' : d < 60 ? `updated ${d} days ago` : `updated ${Math.floor(d / 30)} months ago`;
  return { confidence: d > staleAfter ? 'stale' : 'verified', note };
};

// Vehicle value: the standard Indian motor-insurance (IDV) depreciation schedule.
// After 5 years there's no official rate; we keep falling 10 points a year to a 10% floor (our estimate).
export function vehicleValue(price: number, purchaseIso: string, at = new Date()) {
  const months = (at.getTime() - new Date(purchaseIso).getTime()) / (30.44 * DAY);
  let dep: number;
  if (months <= 6) dep = 0.05;
  else if (months <= 12) dep = 0.15;
  else if (months <= 24) dep = 0.2;
  else if (months <= 36) dep = 0.3;
  else if (months <= 48) dep = 0.4;
  else if (months <= 60) dep = 0.5;
  else dep = Math.min(0.9, 0.5 + Math.ceil((months - 60) / 12) * 0.1);
  return Math.round(price * (1 - dep));
}

// Gold: grams × purity × 24K rate (rate excludes making charges and GST, like IBJA)
export const goldValue = (grams: number, karat: number, rate24k: number) => Math.round(grams * (karat / 24) * rate24k);

export function assetValue(a: ManualAsset, at = new Date()) {
  if (a.kind === 'vehicle' && a.purchasePrice && a.purchaseDate) return vehicleValue(a.purchasePrice, a.purchaseDate, at);
  if (a.kind === 'gold' && a.grams && a.karat && a.rate24k) return goldValue(a.grams, a.karat, a.rate24k);
  return a.value;
}

// Money owed to you: discounted the longer it's overdue (our suggested haircuts, not a standard).
// Without a due date we assume it was due 3 months after you lent it.
export function receivableShare(i: Iou, at = new Date()) {
  const due = i.dueDate ? new Date(i.dueDate) : new Date(new Date(i.date).getTime() + 90 * DAY);
  const overdue = Math.floor((at.getTime() - due.getTime()) / DAY);
  if (overdue <= 0) return 1;
  if (overdue <= 90) return 0.9;
  if (overdue <= 180) return 0.75;
  if (overdue <= 365) return 0.5;
  return 0.25;
}

// Open amount as of a date (repayments up to then count)
function openAt(i: Iou, at: Date) {
  if (new Date(i.date) > at) return 0;
  if (i.settledAt && new Date(i.settledAt) <= at) return 0;
  const paid = (i.repayments ?? []).filter((r) => isNaN(new Date(r.date).getTime()) || new Date(r.date) <= at).reduce((s, r) => s + r.amount, 0);
  return Math.max(0, i.amount - paid);
}

// Account balance as of a date: the last check-in on or before it (for today: the live balance)
function balanceAt(a: Account & { balance?: number }, at: Date, isNow: boolean) {
  if (isNow && a.balance !== undefined) return a.balance;
  const hist = (a.checkins ?? []).filter((c) => new Date(c.date) <= at);
  if (hist.length) return hist[hist.length - 1].balance;
  if (new Date(a.openingDate) <= at) return a.opening;
  return null; // didn't exist yet
}

export type NwInput = {
  accounts: (Account & { balance?: number })[];
  ious: Iou[];
  bills: Bill[];
  assets: ManualAsset[];
  jarsTotal?: number;
};

export function netWorthItems(d: NwInput, at = new Date(), isNow = true): NwItem[] {
  const items: NwItem[] = [];

  for (const a of d.accounts.filter((x) => !x.archived)) {
    const bal = balanceAt(a, at, isNow);
    if (bal === null) continue;
    const f = freshness(a.verifiedAt ?? a.openingDate, at, 14);
    const credit = a.type === 'credit';
    items.push({
      id: `acc:${a.id}`,
      label: a.name,
      side: credit ? 'liability' : 'asset',
      group: credit ? 'card' : 'cash',
      value: credit ? Math.max(0, bal) : bal,
      liquid: !credit,
      confidence: f.confidence,
      note: f.note,
      link: '/accounts',
    });
  }

  for (const i of d.ious.filter(isLoan)) {
    const open = openAt(i, at);
    if (open <= 0) continue;
    if (i.direction === 'lent') {
      const share = receivableShare(i, at);
      items.push({
        id: `iou:${i.id}`,
        label: `${i.person} owes you`,
        side: 'asset',
        group: 'receivable',
        value: Math.round(open * share),
        liquid: false,
        confidence: share < 1 ? 'estimated' : 'manual',
        note: share < 1 ? `${Math.round(share * 100)}% of ₹${open.toLocaleString('en-IN')} counted, it's overdue` : i.note,
        link: '/ious',
      });
    } else {
      items.push({ id: `iou:${i.id}`, label: `Owe ${i.person}`, side: 'liability', group: 'people', value: open, liquid: false, confidence: 'manual', note: i.note, link: '/ious' });
    }
  }

  for (const b of d.bills.filter((x) => x.active && x.loan)) {
    const st = loanStatus(b.loan!, isNow ? b.lastLoggedMonth === `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}` : true, at);
    if (st.outstanding <= 0) continue;
    items.push({
      id: `loan:${b.id}`,
      label: b.name,
      side: 'liability',
      group: b.loan!.type === 'home' ? 'homeLoan' : 'loan',
      value: Math.round(st.outstanding),
      liquid: false,
      confidence: 'estimated',
      note: 'principal left, from the loan schedule',
      link: `/bill/${b.id}`,
    });
  }

  for (const a of d.assets) {
    if (new Date(a.addedAt) > at) continue;
    const auto = (a.kind === 'vehicle' && a.purchasePrice && a.purchaseDate) || (a.kind === 'gold' && a.grams && a.rate24k);
    const f = freshness(a.updatedAt, at, a.kind === 'gold' ? 45 : 365);
    items.push({
      id: `asset:${a.id}`,
      label: a.name,
      side: 'asset',
      group: a.kind,
      value: assetValue(a, at),
      liquid: false,
      confidence: a.kind === 'vehicle' && auto ? 'estimated' : f.confidence === 'stale' ? 'stale' : 'manual',
      note: a.kind === 'vehicle' && auto ? 'falls each year (insurance schedule)' : a.kind === 'gold' && auto ? `${a.grams} g · ${a.karat}K · ${f.note}` : f.note,
      link: '/networth',
    });
  }
  return items;
}

export type NwTotals = { assets: number; liabilities: number; total: number; withoutHome: number; liquid: number; hasHome: boolean };

export function netWorthTotals(items: NwItem[]): NwTotals {
  const sum = (f: (i: NwItem) => boolean) => items.filter(f).reduce((s, i) => s + i.value, 0);
  const assets = sum((i) => i.side === 'asset');
  const liabilities = sum((i) => i.side === 'liability');
  const homeAssets = sum((i) => i.group === 'home');
  const homeLoans = sum((i) => i.group === 'homeLoan');
  return {
    assets,
    liabilities,
    total: assets - liabilities,
    // leaving out the home means leaving out its loan too
    withoutHome: assets - homeAssets - (liabilities - homeLoans),
    // money you could actually use, minus everything you owe
    liquid: sum((i) => i.side === 'asset' && i.liquid) - liabilities,
    hasHome: homeAssets > 0 || homeLoans > 0,
  };
}

// Jars are inside your bank balance — if they add up to more than cash + bank, something's off
export function jarsCheck(items: NwItem[], jarsTotal: number) {
  const cash = items.filter((i) => i.group === 'cash').reduce((s, i) => s + i.value, 0);
  return { ok: jarsTotal <= cash || cash === 0, cash, jarsTotal };
}

// Month-end points for the last N months (this month = today), from check-in history + loan schedules
export function netWorthHistory(d: NwInput, months = 12, now = new Date()) {
  const out: { key: string; label: string; date: Date; totals: NwTotals; items: number }[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const isNow = k === 0;
    const date = isNow ? now : new Date(now.getFullYear(), now.getMonth() - k + 1, 0, 23, 59);
    const items = netWorthItems(d, date, isNow);
    // before your accounts existed we only know your debts — that would draw a fake drop
    if (!items.some((i) => i.group === 'cash')) continue;
    out.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      date,
      totals: netWorthTotals(items),
      items: items.length,
    });
  }
  return out;
}

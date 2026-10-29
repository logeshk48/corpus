import type { Account } from '@/types/account';
import type { ManualAsset } from '@/types/asset';
import type { Investment } from '@/types/investment';
import { investMeta } from '@/types/investment';
import { currentValue, isStale } from './investments';
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
export type NwGroup = 'cash' | 'investment' | 'retirement' | 'receivable' | 'home' | 'property' | 'vehicle' | 'gold' | 'other' | 'card' | 'loan' | 'homeLoan' | 'people';

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

export function assetValue(a: ManualAsset, at = new Date(), goldRate?: number | null) {
  if (a.kind === 'vehicle' && a.purchasePrice && a.purchaseDate) return vehicleValue(a.purchasePrice, a.purchaseDate, at);
  // gold follows today's rate (live or your own) when we have one
  const rate = goldRate ?? a.rate24k;
  if (a.kind === 'gold' && a.grams && a.karat && rate) return goldValue(a.grams, a.karat, rate);
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
  goldRate?: { rate: number; mode: 'live' | 'custom' } | null; // today's 24K ₹/g
  investments?: Investment[];
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
    const auto = (a.kind === 'vehicle' && a.purchasePrice && a.purchaseDate) || (a.kind === 'gold' && a.grams && (a.rate24k || d.goldRate));
    const priced = a.kind === 'gold' && !!a.grams && !!d.goldRate && isNow;
    const f = freshness(a.updatedAt, at, a.kind === 'gold' ? 45 : 365);
    items.push({
      id: `asset:${a.id}`,
      label: a.name,
      side: 'asset',
      group: a.kind,
      value: assetValue(a, at, priced ? d.goldRate!.rate : null),
      liquid: false,
      confidence: priced ? (d.goldRate!.mode === 'live' ? 'verified' : 'manual') : a.kind === 'vehicle' && auto ? 'estimated' : f.confidence === 'stale' ? 'stale' : 'manual',
      note: priced
        ? `${a.grams} g · ${a.karat}K · ${d.goldRate!.mode === 'live' ? 'live market rate' : 'your rate'} ₹${d.goldRate!.rate.toLocaleString('en-IN')}/g`
        : a.kind === 'vehicle' && auto ? 'falls each year (insurance schedule)' : a.kind === 'gold' && auto ? `${a.grams} g · ${a.karat}K · ${f.note}` : f.note,
      link: '/networth',
    });
  }
  for (const h of d.investments ?? []) {
    if (new Date(h.startDate) > at) continue;
    const meta = investMeta(h.type);
    const { value, auto } = currentValue(h, at);
    const stale = isNow && isStale(h, at);
    const ret = meta.cls === 'retirement';
    items.push({
      id: `inv:${h.id}`,
      label: h.name,
      side: 'asset',
      group: ret ? 'retirement' : 'investment',
      value,
      liquid: meta.liquid,
      confidence: stale ? 'stale' : auto ? 'estimated' : 'manual',
      note: auto ? `grows at ${h.rate}% a year` : freshness(h.valueAt, at, 45).note,
      link: '/invest',
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

// ─── "What changed": item-by-item difference between two moments ───
export type ChangeLine = { id: string; label: string; delta: number; kind: 'saved' | 'debt' | 'value' | 'new' | 'gone' };

export function explainChange(before: NwItem[], after: NwItem[]): { lines: ChangeLine[]; saved: number; debtPaid: number; valueChange: number; total: number } {
  const signed = (i: NwItem) => (i.side === 'asset' ? i.value : -i.value);
  const b = new Map(before.map((i) => [i.id, i]));
  const a = new Map(after.map((i) => [i.id, i]));
  const lines: ChangeLine[] = [];
  for (const id of new Set([...b.keys(), ...a.keys()])) {
    const x = b.get(id);
    const y = a.get(id);
    const delta = Math.round((y ? signed(y) : 0) - (x ? signed(x) : 0));
    if (delta === 0) continue;
    const item = (y ?? x)!;
    // cash and money owed to you move together (a repayment is cash ↑, receivable ↓);
    // debts are always "debt"; only things like gold, vehicles and property are "value"
    let kind: ChangeLine['kind'];
    if (item.side === 'liability') kind = 'debt';
    else if (item.group === 'cash' || item.group === 'receivable') kind = 'saved';
    else if (!x) kind = 'new';
    else if (!y) kind = 'gone';
    else kind = 'value';
    lines.push({ id, label: item.label, delta, kind });
  }
  lines.sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta));
  const sum = (k: ChangeLine['kind'][]) => lines.filter((l) => k.includes(l.kind)).reduce((s, l) => s + l.delta, 0);
  return { lines, saved: sum(['saved']), debtPaid: sum(['debt']), valueChange: sum(['value', 'new', 'gone']), total: lines.reduce((s, l) => s + l.delta, 0) };
}

// ─── Milestones: reach ₹0 first (if negative), then ₹1 L, 5 L, 10 L, 25 L, 50 L, 1 Cr, 2 Cr, 5 Cr, 10 Cr ───
const STEPS = [0, 1_00_000, 5_00_000, 10_00_000, 25_00_000, 50_00_000, 1_00_00_000, 2_00_00_000, 5_00_00_000, 10_00_00_000];

export function nextMilestone(current: number, monthlyPace: number | null) {
  const target = STEPS.find((s) => s > current) ?? Math.ceil(current / 10_00_00_000 + 1) * 10_00_00_000;
  const from = [...STEPS].reverse().find((s) => s <= current) ?? Math.min(current, 0);
  const span = target - from || 1;
  const progress = Math.max(0, Math.min(1, (current - from) / span));
  const months = monthlyPace && monthlyPace > 0 ? Math.ceil((target - current) / monthlyPace) : null;
  return { target, from, progress, months, debtFree: target === 0 };
}

// Average month-on-month change over the last few saved months
export function monthlyPace(totals: number[]) {
  if (totals.length < 2) return null;
  const last = totals.slice(-4);
  return (last[last.length - 1] - last[0]) / (last.length - 1);
}

// ─── What it's made of ───
export function composition(items: NwItem[], side: 'asset' | 'liability') {
  const map = new Map<NwGroup, number>();
  for (const i of items.filter((x) => x.side === side && x.value > 0)) map.set(i.group, (map.get(i.group) ?? 0) + i.value);
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()].map(([group, value]) => ({ group, value, share: total ? value / total : 0 })).sort((a, b) => b.value - a.value);
}

// ─── Health numbers ───
export function healthRatios(t: NwTotals, items: NwItem[], monthlySpend: number, monthlyIncome: number) {
  const liquidAssets = items.filter((i) => i.side === 'asset' && i.liquid).reduce((s, i) => s + i.value, 0);
  return {
    debtToAssets: t.assets > 0 ? t.liabilities / t.assets : t.liabilities > 0 ? Infinity : 0,
    monthsCovered: monthlySpend > 0 ? liquidAssets / monthlySpend : null,
    monthsOfIncome: monthlyIncome > 0 ? t.total / monthlyIncome : null,
  };
}

export const staleItems = (items: NwItem[]) => items.filter((i) => i.confidence === 'stale');

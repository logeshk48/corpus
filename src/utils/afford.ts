// "Can I afford this?" — a straight answer from your own numbers. No AI, no guessing.
import type { Transaction } from '@/types/transaction';
import { formatINR } from './format';
import type { SafeToSpendResult } from './safeToSpend';

const DAY = 86_400_000;
export const GROWTH = 0.12; // long-run equity estimate used for "if you invested it instead"

// Average monthly income and spending: the last 3 full months that have entries.
// A brand-new user (only this month) gets this month, with spending scaled to a full month.
export function monthlyFlow(tx: Transaction[], now = new Date()) {
  const key = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const cur = key(now);
  const by = new Map<number, { income: number; spend: number }>();
  for (const t of tx) {
    const k = key(new Date(t.date));
    if (k > cur || k < cur - 3) continue;
    const m = by.get(k) ?? { income: 0, spend: 0 };
    t.type === 'income' ? (m.income += t.amount) : (m.spend += t.amount);
    by.set(k, m);
  }
  const full = [...by.entries()].filter(([k]) => k < cur).map(([, v]) => v);
  if (full.length > 0) {
    const n = full.length;
    return { income: full.reduce((a, m) => a + m.income, 0) / n, spend: full.reduce((a, m) => a + m.spend, 0) / n, months: n };
  }
  const m = by.get(cur);
  if (!m) return { income: 0, spend: 0, months: 0 };
  const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { income: m.income, spend: (m.spend / Math.max(1, now.getDate())) * daysIn, months: 0 };
}

export function emiOf(price: number, months: number, ratePct: number) {
  if (months <= 0) return price;
  const r = ratePct / 1200;
  if (r <= 0) return price / months;
  const f = Math.pow(1 + r, months);
  return (price * r * f) / (f - 1);
}

export type AffordVerdict = 'yes' | 'tight' | 'savings' | 'wait' | 'noData';
export type AffordInput = {
  price: number;
  mode: 'now' | 'emi';
  emiMonths?: number;
  emiRate?: number;        // % a year; 0 = no-cost EMI
  safe: SafeToSpendResult;
  have: number | null;     // money in bank/cash/wallet (null = no accounts added)
  cardDues: number;
  billsNext30: number;
  flow: { income: number; spend: number };
  now?: Date;
};
export type AffordResult = {
  verdict: AffordVerdict;
  title: string;
  lines: string[];
  afterDaily?: number;      // per-day amount left after buying (pay now)
  emi?: number;
  interest?: number;
  saveMonths?: number;      // months to save it up
  savePerMonth?: number;
  readyBy?: string;         // 'YYYY-MM'
  grows?: number;           // value in 10 years if invested instead
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const r = (n: number) => formatINR(Math.round(n));

export function canAfford(p: AffordInput): AffordResult {
  const now = p.now ?? new Date();
  const price = Math.max(0, p.price);
  const surplus = p.flow.income > 0 ? p.flow.income - p.flow.spend : null;
  const safety = p.flow.spend * 3; // 3 months of spending stays untouched
  const spare = p.have != null ? p.have - p.cardDues - p.billsNext30 - safety : null;
  const available = p.safe.status === 'noData' ? null : p.safe.available;
  const grows = price >= 10000 ? Math.round(price * Math.pow(1 + GROWTH, 10)) : undefined;
  const growLine = grows ? `If you invested it instead: about ${r(grows)} in 10 years (at ${GROWTH * 100}% a year, an estimate).` : null;

  if (available == null && surplus == null && spare == null) {
    return { verdict: 'noData', title: 'Not enough data yet', lines: ['Add this month’s income (or a monthly budget) and your bank balance, and Corpus can answer this properly.'] };
  }

  // Save it up: what's missing ÷ what you save a month
  const saveUp = (missing: number) => {
    if (surplus == null || surplus <= 0) return {};
    const months = Math.max(1, Math.ceil(missing / surplus));
    const readyBy = monthKey(new Date(now.getFullYear(), now.getMonth() + months, 1));
    return { saveMonths: months, savePerMonth: Math.ceil(missing / months / 100) * 100, readyBy };
  };

  if (p.mode === 'emi') {
    const n = Math.max(1, Math.round(p.emiMonths ?? 6));
    const rate = Math.max(0, p.emiRate ?? 0);
    const emi = emiOf(price, n, rate);
    const interest = Math.max(0, emi * n - price);
    const lines: string[] = [`${r(emi)} a month for ${n} months${interest > 0 ? ` — ${r(interest)} extra in interest` : ' (no-cost EMI)'}.`];
    if (rate === 0) lines.push('No-cost EMIs often add a processing fee and GST on the interest — check the final amount before you agree.');
    if (surplus == null) {
      lines.push('Corpus doesn’t know your monthly income yet, so it can’t check if the EMI fits. Add your income to get a real answer.');
      return { verdict: 'noData', title: 'Can’t check the EMI yet', lines, emi, interest, grows };
    }
    if (surplus <= 0) {
      lines.push(`You already spend about ${r(p.flow.spend)} a month against ${r(p.flow.income)} coming in — nothing is left over for an EMI.`);
      return { verdict: 'wait', title: 'An EMI would push you short', lines, emi, interest, grows };
    }
    const share = emi / surplus;
    lines.push(`You usually have about ${r(surplus)} left each month. This EMI takes ${Math.round(share * 100)}% of it.`);
    const canPayNow = (available ?? 0) >= price || (spare != null && spare + Math.max(0, available ?? 0) >= price);
    if (interest > 0 && canPayNow) lines.push(`You could pay from your money now and skip the ${r(interest)} interest.`);
    else if (interest > 0) {
      const s = saveUp(price - Math.max(0, available ?? 0) - Math.max(0, spare ?? 0));
      if (s.readyBy) lines.push(`Saving ${r(s.savePerMonth!)} a month instead, you could buy it in ${monthLabel(s.readyBy)} with no interest.`);
    }
    if (growLine) lines.push(growLine);
    if (share <= 0.5) return { verdict: 'yes', title: 'Yes, the EMI fits', lines, emi, interest, grows };
    if (share <= 1) return { verdict: 'tight', title: 'It fits, but it’s tight', lines: [...lines, 'Little room is left for surprises while this runs.'], emi, interest, grows };
    return { verdict: 'wait', title: 'The EMI is more than you save', lines, emi, interest, grows };
  }

  // Pay now
  const lines: string[] = [];
  if (available != null && available >= price && p.safe.status !== 'noData') {
    const daysLeft = p.safe.daysLeft;
    const afterDaily = Math.max(0, Math.floor((available - price) / daysLeft));
    const share = available > 0 ? price / available : 1;
    lines.push(`You have ${r(available)} left for the next ${daysLeft} day${daysLeft === 1 ? '' : 's'} after bills, SIPs and jars.`);
    lines.push(`After buying it: ${r(afterDaily)} a day instead of ${r(Math.floor(available / daysLeft))}.`);
    if (growLine) lines.push(growLine);
    if (share <= 0.4) return { verdict: 'yes', title: 'Yes, you can afford it', lines, afterDaily, grows };
    return { verdict: 'tight', title: 'Yes, but the month gets tight', lines, afterDaily, grows };
  }
  const fromMonth = Math.max(0, available ?? 0);
  if (spare != null && spare + fromMonth >= price) {
    lines.push(available != null ? `It’s more than the ${r(fromMonth)} left this month.` : 'This month’s money isn’t tracked yet.');
    lines.push(`You can pay from savings and still keep ${r(safety)} (3 months of spending) as your safety net.`);
    if (p.billsNext30 + p.cardDues > 0) lines.push(`Bills and card dues for the next 30 days (${r(p.billsNext30 + p.cardDues)}) are already kept aside.`);
    if (growLine) lines.push(growLine);
    return { verdict: 'savings', title: 'Only from your savings', lines, grows };
  }
  const missing = price - fromMonth - Math.max(0, spare ?? 0);
  const s = saveUp(missing);
  lines.push(spare == null
    ? `It’s more than the ${r(fromMonth)} left this month. Add your bank balance so Corpus can count your savings too.`
    : `Buying it now would eat into your safety net (3 months of spending, ${r(safety)}).`);
  const using = Math.max(0, spare ?? 0) + fromMonth;
  if (s.readyBy) lines.push(`${using >= 1000 ? `Use the ${r(using)} you can spare now, then save` : 'Save'} ${r(s.savePerMonth!)} a month and you can buy it in ${monthLabel(s.readyBy)}.`);
  else if (surplus != null) lines.push('Right now you spend about as much as you earn, so there’s nothing left over to save for it.');
  if (growLine) lines.push(growLine);
  return { verdict: 'wait', title: 'Not yet', lines, grows, ...s };
}

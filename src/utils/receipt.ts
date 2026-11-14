// Read a pasted bank SMS or receipt text → amount, date, who, money in/out.
// Pure text rules, on the phone — nothing is sent anywhere.
import type { TxType } from '@/types/transaction';

export type ParsedMoney = {
  kind: 'sms' | 'receipt';
  type: TxType;
  amount: number | null;
  date: Date | null;
  merchant: string | null;
  last4: string | null;   // card / account ending, when the SMS shows it
  sure: boolean;          // false = we found an amount but not much else; ask to check
};

const MON: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const num = (s: string) => Number(s.replace(/,/g, ''));
const year = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

export function findDate(text: string, now = new Date()): Date | null {
  const t = text.toLowerCase();
  const tries: (() => Date | null)[] = [
    () => { const m = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; },
    () => { const m = t.match(/\b(\d{1,2})[-/ ]?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*[-/ ,]*(\d{4}|\d{2})\b/); return m ? new Date(year(m[3]), MON[m[2]], +m[1]) : null; },
    () => { const m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/); return m && +m[2] <= 12 ? new Date(year(m[3]), +m[2] - 1, +m[1]) : null; },
  ];
  for (const f of tries) {
    const d = f();
    if (d && !isNaN(d.getTime()) && d.getTime() <= now.getTime() + 86_400_000 && d.getFullYear() >= now.getFullYear() - 2) return d;
  }
  return null;
}

const MONEY = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const NOT_SPEND = /(bal|balance|avl|avbl|available|limit|lmt|due|min)\W*$/i;

const tidy = (s: string) =>
  s.replace(/\s+/g, ' ').replace(/[^\w &.'-]/g, ' ').trim().replace(/\b(pvt|ltd|private|limited|india|in)\b\.?/gi, '').replace(/\s+/g, ' ').trim()
    .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function smsMerchant(t: string): string | null {
  const vpa = t.match(/\b(?:to|vpa|trf to)\s+(?:vpa\s+)?([a-z0-9._-]+)@[a-z]+/i);
  if (vpa) {
    const name = vpa[1].split(/[._-]|\d/).find((w) => w.length >= 3);
    if (name) return tidy(name);
  }
  const pats = [
    /\bat\s+([a-z0-9][a-z0-9 &.'-]{1,40}?)(?=\s+on\b|\s+ref\b|\.\s|\.$|,|$|\s+avl|\s+txn)/i,
    /\binfo[:\s-]+([a-z0-9][a-z0-9 &.'/-]{1,40}?)(?=\.|,|$)/i,
    /\btrf to\s+([a-z][a-z0-9 .'-]{1,40}?)(?=\s+ref|\s+on\b|\.|$)/i,
    /\bto\s+([a-z][a-z .'-]{1,40}?)(?=\s+on\b|\s+ref|\s+upi|\.|,|$)/i,
    /\b(?:by|from)\s+(?:neft|imps|upi|rtgs)?[-/ :]*([a-z][a-z0-9 .'-]{1,40}?)(?=\s+on\b|\s+ref|\.|,|$)/i,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (!m) continue;
    const name = tidy(m[1].replace(/^(a\/?c|ac|account|card)\b.*/i, ''));
    if (name.length >= 2 && !/^(your|a c|ac|xx|x+\d*|bank|the)$/i.test(name)) return name;
  }
  return null;
}

function parseSms(text: string, now: Date): ParsedMoney | null {
  const t = text.replace(/\s+/g, ' ');
  const out = /\b(debited|spent|sent|paid|withdrawn|purchase|txn of|deducted|dr\b)/i.test(t);
  const inn = /\b(credited|received|deposited|refund(?:ed)?|cr\b)/i.test(t);
  if (!out && !inn) return null;
  let amount: number | null = null;
  for (const m of t.matchAll(MONEY)) {
    if (NOT_SPEND.test(t.slice(Math.max(0, m.index! - 14), m.index!))) continue;
    amount = num(m[1]);
    break;
  }
  if (amount == null) {
    const m = t.match(/\b(?:debited|credited)\s+(?:by|with|for)\s+([\d,]+(?:\.\d{1,2})?)/i);
    if (m) amount = num(m[1]);
  }
  if (amount == null || !(amount > 0)) return null;
  const last4 = t.match(/(?:a\/?c|ac|acct|account|card)[^0-9]{0,20}?(?:x+|\*+)\s*(\d{3,4})/i)?.[1] ?? null;
  const merchant = smsMerchant(t);
  const date = findDate(t, now);
  return { kind: 'sms', type: out ? 'expense' : 'income', amount, date, merchant, last4, sure: !!(merchant || date) };
}

const TOTAL_WORDS: [RegExp, number][] = [
  [/grand\s*total/i, 5], [/(net|total)\s*(amount\s*)?payable|amount\s*payable|to\s*pay/i, 4],
  [/net\s*(amount|amt|total)|bill\s*amount|total\s*amount|total\s*amt/i, 3], [/\btotal\b/i, 2],
];
const SKIP_TOTAL = /sub\s*-?\s*total|total\s*(qty|quantity|items?|savings?|discount|tax|gst)|you\s*saved/i;
const NUM_IN_LINE = /([\d,]+\.\d{2}|[\d,]{2,})(?!.*[\d,]+\.\d{2})/;

function parseReceipt(text: string, now: Date): ParsedMoney | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  let best: { amount: number; score: number } | null = null;
  lines.forEach((l, i) => {
    if (SKIP_TOTAL.test(l)) return;
    const w = TOTAL_WORDS.find(([re]) => re.test(l));
    if (!w) return;
    // the number may sit on the same line or the next one
    const m = l.match(NUM_IN_LINE) ?? lines[i + 1]?.match(/^[₹rs.\s]*([\d,]+(?:\.\d{2})?)\s*$/i);
    if (!m) return;
    const amount = num(m[1]);
    if (amount > 0 && (!best || w[1] > best.score || (w[1] === best.score && i > 0))) best = { amount, score: w[1] };
  });
  let amount = (best as { amount: number } | null)?.amount ?? null;
  if (amount == null) {
    const all = [...text.matchAll(MONEY)].map((m) => num(m[1])).filter((x) => x > 0);
    amount = all.length ? Math.max(...all) : null;
  }
  if (amount == null) return null;
  const merchant = lines.find((l) => /[a-z]{3}/i.test(l) && !/tax\s*invoice|invoice|receipt|bill\b|cash\s*memo|gstin|welcome|thank|date|time|ph(one)?[:\s]|mob/i.test(l));
  return { kind: 'receipt', type: 'expense', amount, date: findDate(text, now), merchant: merchant ? tidy(merchant).slice(0, 30) : null, last4: null, sure: !!best };
}

export function parseMoneyText(text: string, now = new Date()): ParsedMoney | null {
  if (!text.trim()) return null;
  return parseSms(text, now) ?? parseReceipt(text, now);
}

import type { Iou } from '@/types/iou';
import { formatINR } from './format';

const DAY = 86_400_000;
export const personKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export const repaid = (i: Iou) => (i.repayments ?? []).reduce((s, r) => s + r.amount, 0);
export const remaining = (i: Iou) => Math.max(0, Math.round((i.amount - repaid(i)) * 100) / 100);
export const isLoan = (i: Iou) => (i.kind ?? 'loan') === 'loan';
export const isOpen = (i: Iou) => isLoan(i) && !i.settledAt && remaining(i) > 0;
export const isOverdue = (i: Iou, now = new Date()) =>
  isOpen(i) && !!i.dueDate && new Date(i.dueDate).getTime() < startOfDay(now).getTime();

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type PersonSummary = {
  key: string;
  person: string;     // display name (most recent spelling)
  theyOwe: number;    // open amounts you lent them
  youOwe: number;     // open amounts you borrowed from them
  net: number;        // + they owe you · − you owe them
  open: Iou[];        // newest first
  settled: Iou[];
  overdue: boolean;
  oldestOpen?: string; // ISO date of the oldest open entry
};

export function byPerson(ious: Iou[], now = new Date()): PersonSummary[] {
  const map = new Map<string, PersonSummary>();
  const sorted = [...ious].sort((a, b) => b.date.localeCompare(a.date));
  for (const i of sorted) {
    if (!isLoan(i)) continue; // support & gifts are listed separately
    const key = personKey(i.person);
    const p = map.get(key) ?? { key, person: i.person.trim(), theyOwe: 0, youOwe: 0, net: 0, open: [], settled: [], overdue: false };
    if (isOpen(i)) {
      const left = remaining(i);
      if (i.direction === 'lent') p.theyOwe += left;
      else p.youOwe += left;
      p.open.push(i);
      if (isOverdue(i, now)) p.overdue = true;
      if (!p.oldestOpen || i.date < p.oldestOpen) p.oldestOpen = i.date;
    } else {
      p.settled.push(i);
    }
    map.set(key, p);
  }
  return [...map.values()]
    .map((p) => ({ ...p, net: p.theyOwe - p.youOwe }))
    .sort((a, b) => Number(b.open.length > 0) - Number(a.open.length > 0) || Math.abs(b.net) - Math.abs(a.net));
}

export function totals(people: PersonSummary[]) {
  return {
    toGet: people.reduce((s, p) => s + Math.max(0, p.net), 0),
    toPay: people.reduce((s, p) => s + Math.max(0, -p.net), 0),
  };
}

export function ageLabel(iso: string, now = new Date()) {
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(new Date(iso)).getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// A polite WhatsApp-ready reminder listing what's still open
export function reminderText(p: PersonSummary, upiId?: string) {
  const lent = p.open.filter((i) => i.direction === 'lent');
  if (lent.length === 0 || p.net <= 0) return '';
  const lines = lent.map((i) => `• ${formatINR(remaining(i))}${i.note ? ` for ${i.note}` : ''} (${shortDate(i.date)})`);
  return [
    `Hi ${p.person.split(' ')[0]}! Gentle reminder about the money from earlier:`,
    ...lines,
    p.youOwe > 0 ? `Minus ${formatINR(p.youOwe)} I owe you, that's ${formatINR(p.net)} in total.` : lent.length > 1 ? `That's ${formatINR(p.net)} in total.` : '',
    upiId ? `UPI: ${upiId}` : '',
    'Thanks! 🙏',
  ].filter(Boolean).join('\n');
}

// Names you've used before, most frequent first (for the person field)
export function knownPeople(ious: Iou[]) {
  const count = new Map<string, { name: string; n: number }>();
  for (const i of ious) {
    const k = personKey(i.person);
    count.set(k, { name: count.get(k)?.name ?? i.person.trim(), n: (count.get(k)?.n ?? 0) + 1 });
  }
  return [...count.values()].sort((a, b) => b.n - a.n).map((x) => x.name);
}

// Spread one payment across a person's open entries, oldest first.
// Returns [entry, amount] pairs to record; leftover > 0 means it was more than owed.
export function allocatePayment(open: Iou[], amount: number) {
  const parts: { iou: Iou; amount: number }[] = [];
  let left = amount;
  for (const i of [...open].sort((a, b) => a.date.localeCompare(b.date))) {
    if (left <= 0) break;
    const take = Math.min(left, remaining(i));
    if (take > 0) parts.push({ iou: i, amount: take });
    left = Math.round((left - take) * 100) / 100;
  }
  return { parts, leftover: left };
}

// ── Progress on one loan: "₹18,000 of ₹30,000 paid · 60%", and when it'll be done at this pace ──
export function progress(i: Iou, now = new Date()) {
  const paid = repaid(i);
  const pct = i.amount > 0 ? Math.min(100, Math.round((paid / i.amount) * 100)) : 0;
  let doneBy: Date | undefined;
  const pays = (i.repayments ?? []).map((r) => new Date(r.date).getTime()).filter((t) => !isNaN(t));
  if (pays.length >= 2 && remaining(i) > 0) {
    const months = Math.max(1, (now.getTime() - new Date(i.date).getTime()) / (30.44 * DAY));
    const perMonth = paid / months;
    if (perMonth > 0) doneBy = new Date(now.getTime() + (remaining(i) / perMonth) * 30.44 * DAY);
  }
  return { paid, pct, doneBy };
}

// ── Support & gifts: money given (or received) that isn't expected back ──
export function givingSummary(ious: Iou[], now = new Date()) {
  const year = now.getFullYear();
  const items = ious.filter((i) => !isLoan(i)).sort((a, b) => b.date.localeCompare(a.date));
  const thisYear = items.filter((i) => new Date(i.date).getFullYear() === year);
  const sum = (list: Iou[], d: Iou['direction']) => list.filter((i) => i.direction === d).reduce((s, i) => s + i.amount, 0);
  const perPerson = new Map<string, { person: string; given: number }>();
  for (const i of thisYear.filter((x) => x.direction === 'lent')) {
    const k = personKey(i.person);
    perPerson.set(k, { person: i.person.trim(), given: (perPerson.get(k)?.given ?? 0) + i.amount });
  }
  return {
    items,
    givenThisYear: sum(thisYear, 'lent'),
    receivedThisYear: sum(thisYear, 'borrowed'),
    topPeople: [...perPerson.values()].sort((a, b) => b.given - a.given),
  };
}

// wa.me needs digits with country code; assume India for 10-digit numbers
export function whatsappUrl(phone: string, text: string) {
  let d = phone.replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

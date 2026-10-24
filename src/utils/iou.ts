import type { Iou } from '@/types/iou';
import { formatINR } from './format';

const DAY = 86_400_000;
export const personKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

export const repaid = (i: Iou) => (i.repayments ?? []).reduce((s, r) => s + r.amount, 0);
export const remaining = (i: Iou) => Math.max(0, Math.round((i.amount - repaid(i)) * 100) / 100);
export const isOpen = (i: Iou) => !i.settledAt && remaining(i) > 0;
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

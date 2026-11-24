// Month Wrapped: your month told as a short story. Everything comes from what you logged.
import { findCategory } from '@/constants/categories';
import type { Investment } from '@/types/investment';
import type { Transaction } from '@/types/transaction';
import { monthKeyOf, monthReport, type MonthReport } from './monthReport';

export type Wrapped = MonthReport & {
  entries: number;
  biggestDay: { date: Date; amount: number; top: string } | null;
  small: { count: number; total: number };
  noSpendDays: number[];           // day numbers with no spending
  spendDays: Set<number>;
  favourite: { label: string; count: number; total: number } | null; // the note you logged most often (Swiggy, auto, chai)
  topIcon: string;
  topShare: number;                // top category's share of spending, 0 to 1
  persona: { title: string; line: string; icon: string };
};

const PERSONAS = (w: Omit<Wrapped, 'persona'>) => [
  { when: w.rate != null && w.rate >= 0.3, title: 'The Saver', line: `You kept ${Math.round((w.rate ?? 0) * 100)}% of what came in.`, icon: 'trophy' },
  { when: w.spentChange != null && w.spentChange <= -0.1, title: 'The Comeback', line: `You spent ${Math.round(Math.abs(w.spentChange ?? 0) * 100)}% less than the month before.`, icon: 'trending-down' },
  { when: w.noSpendDays.length >= 8, title: 'The Minimalist', line: `${w.noSpendDays.length} days without spending a rupee.`, icon: 'leaf' },
  { when: w.loggedDays >= w.daysIn * 0.8, title: 'The Tracker', line: `You logged on ${w.loggedDays} of ${w.daysIn} days.`, icon: 'checkmark-done' },
  { when: w.rate != null && w.rate >= 0.1, title: 'Steady Hands', line: `You kept ${Math.round((w.rate ?? 0) * 100)}% and stayed on course.`, icon: 'shield-checkmark' },
  { when: w.small.count >= 25, title: 'The Snacker', line: `${w.small.count} little spends under ₹200.`, icon: 'cafe' },
  { when: true, title: 'Just Getting Started', line: 'Every month you log makes the next one clearer.', icon: 'rocket' },
].find((p) => p.when)!;

export function wrapped(p: { tx: Transaction[]; investments: Investment[]; month: string; budget?: number; netWorth?: Record<string, { total: number }>; scoreLog?: Record<string, number> }): Wrapped {
  const r = monthReport(p);
  const mine = p.tx.filter((t) => monthKeyOf(new Date(t.date)) === p.month);
  const exp = mine.filter((t) => t.type === 'expense');
  const byDay = new Map<number, { amount: number; cats: Map<string, number> }>();
  for (const t of exp) {
    const d = new Date(t.date).getDate();
    const e = byDay.get(d) ?? { amount: 0, cats: new Map() };
    e.amount += t.amount;
    e.cats.set(t.category, (e.cats.get(t.category) ?? 0) + t.amount);
    byDay.set(d, e);
  }
  const [y, m] = p.month.split('-').map(Number);
  const isNow = p.month === monthKeyOf(new Date());
  const lastDay = isNow ? new Date().getDate() : r.daysIn;
  const big = [...byDay.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
  const notes = new Map<string, { label: string; count: number; total: number }>();
  for (const t of exp) {
    const n = (t.note ?? '').trim();
    if (!n) continue;
    const k = n.toLowerCase();
    const g = notes.get(k) ?? { label: n, count: 0, total: 0 };
    g.count += 1; g.total += t.amount;
    notes.set(k, g);
  }
  const fav = [...notes.values()].filter((g) => g.count >= 2).sort((a, b) => b.count - a.count || b.total - a.total)[0] ?? null;
  const topId = [...exp.reduce((mm, t) => mm.set(t.category, (mm.get(t.category) ?? 0) + t.amount), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const base = {
    ...r,
    entries: mine.length,
    biggestDay: big ? { date: new Date(y, m - 1, big[0]), amount: big[1].amount, top: findCategory('expense', [...big[1].cats.entries()].sort((a, b) => b[1] - a[1])[0][0])?.label ?? '' } : null,
    small: { count: exp.filter((t) => t.amount < 200).length, total: exp.filter((t) => t.amount < 200).reduce((a, t) => a + t.amount, 0) },
    noSpendDays: Array.from({ length: lastDay }, (_, i) => i + 1).filter((d) => !byDay.has(d)),
    spendDays: new Set(byDay.keys()),
    favourite: fav,
    topIcon: (topId && findCategory('expense', topId)?.icon) || 'pricetag',
    topShare: r.spent && r.top ? r.top.amount / r.spent : 0,
  };
  return { ...base, persona: PERSONAS(base) };
}

// The words for sharing: percentages and badges only, never amounts
export function wrappedShareText(w: Wrapped) {
  const lines = [
    `My ${w.name} on Corpus: ${w.persona.title}.`,
    w.rate != null && w.rate > 0 ? `I kept ${Math.round(w.rate * 100)}% of what came in.` : null,
    w.noSpendDays.length ? `${w.noSpendDays.length} days with no spending at all.` : null,
    w.top ? `Most of it went to ${w.top.label.toLowerCase()}.` : null,
    `Logged ${w.loggedDays} of ${w.daysIn} days.`,
    '#CorpusWrapped',
  ].filter(Boolean);
  return lines.join(' ');
}

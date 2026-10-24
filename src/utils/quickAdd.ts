import type { Transaction, TxType } from '@/types/transaction';

// ─── Quick add: learn from what you log, so logging takes 3 seconds ───

export const normNote = (s?: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const DAY = 86_400_000;

// Common Indian merchants & words → category. History always wins over this list.
const KEYWORDS: Record<string, string[]> = {
  food: ['swiggy', 'zomato', 'chai', 'tea', 'coffee', 'lunch', 'dinner', 'breakfast', 'snack', 'biryani', 'dosa', 'idli',
    'restaurant', 'hotel', 'cafe', 'pizza', 'burger', 'juice', 'groceries', 'grocery', 'vegetables', 'milk', 'bigbasket',
    'blinkit', 'zepto', 'instamart', 'dmart', 'bakery', 'fruits', 'canteen', 'mess'],
  travel: ['uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'metro', 'bus', 'train', 'irctc', 'flight', 'indigo', 'petrol',
    'diesel', 'fuel', 'toll', 'parking', 'fastag', 'redbus', 'makemytrip'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'clothes', 'shoes', 'shirt', 'dress', 'mall',
    'decathlon', 'croma', 'reliance digital'],
  bills: ['rent', 'electricity', 'eb bill', 'current bill', 'water', 'wifi', 'broadband', 'internet', 'jio', 'airtel', 'vi',
    'recharge', 'mobile bill', 'dth', 'gas', 'cylinder', 'emi', 'loan', 'insurance', 'maintenance', 'society'],
  health: ['doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'medical', 'apollo', 'pharmeasy', '1mg', 'netmeds',
    'lab', 'test', 'dentist', 'gym', 'cult', 'yoga'],
  fun: ['movie', 'pvr', 'inox', 'bookmyshow', 'netflix', 'prime', 'hotstar', 'spotify', 'youtube premium', 'game',
    'party', 'drinks', 'beer', 'concert', 'trip', 'outing'],
  education: ['course', 'udemy', 'coursera', 'book', 'books', 'fees', 'fee', 'tuition', 'exam', 'school', 'college',
    'stationery', 'kindle'],
};

const recent = (tx: Transaction[], type: TxType, now: Date, days: number) =>
  tx.filter((t) => t.type === type && !t.recurringId && now.getTime() - new Date(t.date).getTime() <= days * DAY);

// Most frequent value in a list (ties → first seen, i.e. most recent if tx are newest-first)
function mode<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  let best: T | undefined;
  let bestN = 0;
  for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

// ── 1. One-tap chips: things you log again and again ──
export type QuickPick = { note: string; category: string; amount: number; count: number };

export function frequentPicks(tx: Transaction[], type: TxType = 'expense', now = new Date(), limit = 6): QuickPick[] {
  const groups = new Map<string, { picks: Transaction[]; last: number }>();
  for (const t of recent(tx, type, now, 90)) {
    const key = `${normNote(t.note) || '·'}|${t.category}|${t.amount}`;
    const g = groups.get(key) ?? { picks: [], last: 0 };
    g.picks.push(t);
    g.last = Math.max(g.last, new Date(t.date).getTime());
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.picks.length >= 2)
    .sort((a, b) => b.picks.length - a.picks.length || b.last - a.last)
    .slice(0, limit)
    .map((g) => ({
      note: g.picks[0].note?.trim() ?? '',
      category: g.picks[0].category,
      amount: g.picks[0].amount,
      count: g.picks.length,
    }));
}

// ── 2. Note autocomplete: past notes that start with what you're typing ──
export type NoteSuggestion = { note: string; category: string; amount: number };

export function noteSuggestions(tx: Transaction[], typed: string, type: TxType = 'expense', limit = 4): NoteSuggestion[] {
  const q = normNote(typed);
  if (q.length < 2) return [];
  const byNote = new Map<string, Transaction[]>();
  for (const t of tx) {
    if (t.type !== type || !t.note) continue;
    const n = normNote(t.note);
    if (n === q || !n.split(' ').some((w, i, ws) => ws.slice(i).join(' ').startsWith(q))) continue;
    byNote.set(n, [...(byNote.get(n) ?? []), t]);
  }
  return [...byNote.values()]
    .sort((a, b) => b.length - a.length)
    .slice(0, limit)
    .map((list) => ({
      note: list[0].note!.trim(),
      category: mode(list.map((t) => t.category))!,
      amount: mode(list.map((t) => t.amount))!,
    }));
}

// ── 3. Category guess from the note: your history first, then common words ──
export type Guess = { category: string; source: 'history' | 'keyword' };

export function guessCategory(note: string, tx: Transaction[], type: TxType = 'expense'): Guess | undefined {
  const q = normNote(note);
  if (q.length < 2) return undefined;
  const same = tx.filter((t) => t.type === type && normNote(t.note) === q);
  const fromHistory = mode(same.map((t) => t.category));
  if (fromHistory) return { category: fromHistory, source: 'history' };
  if (type !== 'expense') return undefined;
  const padded = ` ${q.replace(/[^a-z0-9 ]/g, ' ')} `;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    // whole words only, so "tea" doesn't match "team"
    if (words.some((w) => padded.includes(` ${w} `))) {
      return { category: cat, source: 'keyword' };
    }
  }
  return undefined;
}

// Ask Corpus — plain-English questions about your own money, answered on the phone.
// Rules, not AI: every number comes straight from your entries.
import { EXPENSE_CATEGORIES, findCategory } from '@/constants/categories';
import type { Bill } from '@/types/bill';
import type { Iou } from '@/types/iou';
import type { Transaction } from '@/types/transaction';
import { formatINR } from './format';
import { byPerson, totals } from './iou';
import { upcomingBills } from './moneyHealth';
import { guessCategory, normNote } from './quickAdd';
import type { SafeToSpendResult } from './safeToSpend';

export type Answer = { text: string; detail?: string[]; href?: string; hrefLabel?: string };
export type AskData = { tx: Transaction[]; bills: Bill[]; ious: Iou[]; safe: SafeToSpendResult | null; now?: Date };

export const EXAMPLES = [
  'How much did I spend this month?',
  'Swiggy last month',
  'Where does my money go?',
  'Biggest expenses this month',
  'How much did I save last month?',
  'Food in October',
  'Bills due',
  'Who owes me?',
  'How much can I spend today?',
];

const r = (n: number) => formatINR(Math.round(n));
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const DAY = 86_400_000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

type Range = { start: Date; end: Date; label: string; prev: { start: Date; end: Date; label: string } | null; phrase: RegExp };

export function parsePeriod(q: string, now = new Date()): Range {
  const t = sod(now);
  const tomorrow = new Date(t.getTime() + DAY);
  const elapsed = (start: Date, prevStart: Date, label: string) => ({ start: prevStart, end: new Date(prevStart.getTime() + (now.getTime() - start.getTime())), label });
  let m: RegExpMatchArray | null;
  if (/\btoday\b/.test(q)) return { start: t, end: tomorrow, label: 'today', prev: { start: new Date(t.getTime() - DAY), end: t, label: 'yesterday' }, phrase: /\btoday\b/ };
  if (/\byesterday\b/.test(q)) return { start: new Date(t.getTime() - DAY), end: t, label: 'yesterday', prev: null, phrase: /\byesterday\b/ };
  if ((m = q.match(/\b(?:last|past)\s+(\d{1,3})\s+days?\b/))) {
    const n = +m[1]; const start = new Date(t.getTime() - (n - 1) * DAY);
    return { start, end: tomorrow, label: `the last ${n} days`, prev: { start: new Date(start.getTime() - n * DAY), end: start, label: `the ${n} days before` }, phrase: /\b(?:last|past)\s+\d{1,3}\s+days?\b/ };
  }
  if ((m = q.match(/\b(?:last|past)\s+(\d{1,2})\s+months?\b/))) {
    const n = +m[1]; const start = new Date(t.getFullYear(), t.getMonth() - n + 1, 1);
    return { start, end: tomorrow, label: `the last ${n} months`, prev: null, phrase: /\b(?:last|past)\s+\d{1,2}\s+months?\b/ };
  }
  const wk = new Date(t.getTime() - ((t.getDay() + 6) % 7) * DAY); // Monday
  if (/\bthis week\b/.test(q)) return { start: wk, end: tomorrow, label: 'this week', prev: elapsed(wk, new Date(wk.getTime() - 7 * DAY), 'the same days last week'), phrase: /\bthis week\b/ };
  if (/\blast week\b/.test(q)) return { start: new Date(wk.getTime() - 7 * DAY), end: wk, label: 'last week', prev: { start: new Date(wk.getTime() - 14 * DAY), end: new Date(wk.getTime() - 7 * DAY), label: 'the week before' }, phrase: /\blast week\b/ };
  const mStart = new Date(t.getFullYear(), t.getMonth(), 1);
  if (/\blast month\b/.test(q)) {
    const s = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    return { start: s, end: mStart, label: MONTHS[s.getMonth()][0].toUpperCase() + MONTHS[s.getMonth()].slice(1), prev: { start: new Date(t.getFullYear(), t.getMonth() - 2, 1), end: s, label: 'the month before' }, phrase: /\blast month\b/ };
  }
  if (/\bthis year\b/.test(q)) { const s = new Date(t.getFullYear(), 0, 1); return { start: s, end: tomorrow, label: `${t.getFullYear()} so far`, prev: elapsed(s, new Date(t.getFullYear() - 1, 0, 1), 'the same time last year'), phrase: /\bthis year\b/ }; }
  for (let i = 0; i < 12; i++) {
    const re = new RegExp(`\\b(?:in\\s+)?(?:${MONTHS[i]}|${SHORT[i]})\\b(?:\\s+(20\\d{2}))?`);
    const mm = q.match(re);
    if (!mm || (SHORT[i] === 'may' && !/\bin may\b|\bmay 20\d{2}\b|^may\b/.test(q))) continue;
    const y = mm[1] ? +mm[1] : i <= t.getMonth() ? t.getFullYear() : t.getFullYear() - 1;
    const s = new Date(y, i, 1), e = new Date(y, i + 1, 1);
    const cur = s.getTime() === mStart.getTime();
    return { start: s, end: cur ? tomorrow : e, label: MONTHS[i][0].toUpperCase() + MONTHS[i].slice(1) + (y !== t.getFullYear() ? ` ${y}` : ''), prev: cur ? elapsed(s, new Date(y, i - 1, 1), 'the same days last month') : { start: new Date(y, i - 1, 1), end: s, label: 'the month before' }, phrase: re };
  }
  return { start: mStart, end: tomorrow, label: 'this month', prev: elapsed(mStart, new Date(t.getFullYear(), t.getMonth() - 1, 1), 'the same days last month'), phrase: /\bthis month\b/ };
}

const STOP = new Set('how much many what whats was were is are did do does i me my mine on at for in to from the a an spend spent spending spends pay paid cost costs money total amount so far and of with have has had been there please tell show give all this last month week year today yesterday days months past expenses expense'.split(' '));

type Filter = { label: string; test: (t: Transaction) => boolean; why?: string } | null;
function findFilter(q: string, tx: Transaction[]): Filter {
  const words = q.replace(/[^a-z0-9 &']/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
  if (words.length === 0) return null;
  const phrase = words.join(' ');
  for (const c of EXPENSE_CATEGORIES) {
    if (words.includes(c.id) || words.includes(c.label.toLowerCase())) return { label: c.label, test: (t) => t.type === 'expense' && t.category === c.id };
  }
  const inNotes = (p: string) => tx.some((t) => normNote(t.note).includes(p));
  for (const p of [phrase, ...words.filter((w) => w.length >= 3)]) {
    if (inNotes(p)) return { label: p.replace(/\b\w/g, (c) => c.toUpperCase()), test: (t) => normNote(t.note).includes(p) };
  }
  const g = guessCategory(phrase, [], 'expense');
  if (g) { const lbl = findCategory('expense', g.category)?.label ?? g.category; return { label: lbl, test: (t) => t.type === 'expense' && t.category === g.category, why: `No “${phrase}” in your notes, so this is all of ${lbl}.` }; }
  return { label: phrase, test: () => false };
}

const when = (label: string) => (['today', 'yesterday', 'this month', 'this week', 'last week'].includes(label) ? label : `in ${label}`);
const inRange = (t: Transaction, a: Date, b: Date) => { const x = new Date(t.date).getTime(); return x >= a.getTime() && x < b.getTime(); };
const sum = (l: Transaction[]) => l.reduce((s, t) => s + t.amount, 0);
const change = (now: number, before: number, label: string) => {
  if (before <= 0) return null;
  const d = (now - before) / before;
  if (Math.abs(d) < 0.05) return `About the same as ${label} (${r(before)}).`;
  return `${d > 0 ? 'Up' : 'Down'} ${Math.round(Math.abs(d) * 100)}% from ${label} (${r(before)}).`;
};

export function ask(question: string, d: AskData): Answer {
  const now = d.now ?? new Date();
  const q = ` ${question.toLowerCase().replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const P = parsePeriod(q, now);
  const inP = d.tx.filter((t) => inRange(t, P.start, P.end));
  const inPrev = P.prev ? d.tx.filter((t) => inRange(t, P.prev!.start, P.prev!.end)) : [];
  const exp = inP.filter((t) => t.type === 'expense');
  const inc = inP.filter((t) => t.type === 'income');
  const has = (re: RegExp) => re.test(q);

  if (has(/\b(safe|can i spend|left to spend|spend today|allowance)\b/) && !has(/\b(on|at)\b \w/)) {
    if (!d.safe || d.safe.status === 'noData') return { text: 'Corpus needs this month’s income or a monthly budget to work that out.', href: '/add', hrefLabel: 'Add income' };
    return { text: d.safe.safeToday >= 0 ? `You can spend ${r(d.safe.safeToday)} today.` : `You’re ${r(-d.safe.safeToday)} over today’s amount.`, detail: [`${r(d.safe.available)} left for the next ${d.safe.daysLeft} days, after bills, SIPs and jars.`] };
  }
  if (has(/\b(due|dues|upcoming|subscriptions?|renewals?)\b/) || (has(/\b(bills?|emis?)\b/) && !has(/\b(spen\w*|spent|paid|cost)\b/))) {
    const up = upcomingBills(d.bills, now, 30);
    if (up.length === 0) return { text: d.bills.length ? 'Nothing due in the next 30 days.' : 'You haven’t added any bills yet.', href: '/bills', hrefLabel: 'Open bills' };
    return {
      text: `${up.length} bill${up.length > 1 ? 's' : ''} due in the next 30 days — ${r(sum(up.map((u) => ({ amount: u.amount }) as Transaction)))} in total.`,
      detail: up.slice(0, 6).map((u) => `${u.due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${u.bill.name} · ${r(u.amount)}`),
      href: '/bills', hrefLabel: 'Open bills',
    };
  }
  if (has(/\b(owe|owes|lent|borrow|borrowed|people|friends?)\b/)) {
    const people = byPerson(d.ious, now).filter((p) => p.open.length > 0);
    const tt = totals(people);
    if (people.length === 0) return { text: 'All square — nobody owes you and you owe nobody.', href: '/ious', hrefLabel: 'Open people' };
    const theirs = people.filter((p) => p.net > 0).slice(0, 4).map((p) => `${p.person} owes you ${r(p.net)}${p.overdue ? ' (overdue)' : ''}`);
    const mine = people.filter((p) => p.net < 0).slice(0, 4).map((p) => `You owe ${p.person} ${r(-p.net)}`);
    return { text: `People owe you ${r(tt.toGet)}; you owe ${r(tt.toPay)}.`, detail: [...theirs, ...mine], href: '/ious', hrefLabel: 'Open people' };
  }
  if (has(/\b(save|saved|saving|savings)\b/)) {
    const i = sum(inc), e = sum(exp);
    if (i === 0) return { text: `No income logged ${when(P.label)}, so Corpus can’t tell what you saved. You spent ${r(e)}.` };
    return { text: `You saved ${r(i - e)} ${when(P.label)} — ${Math.round(((i - e) / i) * 100)}% of the ${r(i)} that came in.`, detail: [`Spent ${r(e)}.`] };
  }
  if (has(/\b(earn|earned|income|salary|received|got paid|came in)\b/)) {
    const i = sum(inc);
    const top = [...new Map(inc.map((t) => [t.note || findCategory('income', t.category)?.label || t.category, 0])).keys()].slice(0, 4);
    return { text: `${r(i)} came in ${when(P.label).replace(/^in /, "during ")}.`, detail: [change(i, sum(inPrev.filter((t) => t.type === 'income')), P.prev?.label ?? '') ?? '', top.length ? `From: ${top.join(', ')}` : ''].filter(Boolean) };
  }
  if (has(/\b(biggest|largest|highest|most expensive|top)\b/) && !has(/\bcategor/)) {
    const top = [...exp].sort((a, b) => b.amount - a.amount).slice(0, 5);
    if (top.length === 0) return { text: `No spending logged ${when(P.label)}.` };
    return { text: `Your biggest spend ${when(P.label)}: ${r(top[0].amount)}${top[0].note ? ` on ${top[0].note}` : ''}.`, detail: top.map((t) => `${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${t.note || findCategory('expense', t.category)?.label} · ${r(t.amount)}`) };
  }
  if (has(/\b(where|categor\w*|breakdown|split|go|goes|most on)\b/)) {
    const by = new Map<string, number>();
    for (const t of exp) by.set(t.category, (by.get(t.category) ?? 0) + t.amount);
    const tot = sum(exp);
    if (tot === 0) return { text: `No spending logged ${when(P.label)}.` };
    const rows = [...by.entries()].sort((a, b) => b[1] - a[1]);
    return { text: `${r(tot)} spent ${when(P.label)}. Most went on ${findCategory('expense', rows[0][0])?.label ?? rows[0][0]}.`, detail: rows.slice(0, 6).map(([c, v]) => `${findCategory('expense', c)?.label ?? c} · ${r(v)} · ${Math.round((v / tot) * 100)}%`), href: '/analytics', hrefLabel: 'Open analytics' };
  }
  if (has(/\b(average|avg|per day|daily|a day)\b/)) {
    const days = Math.max(1, Math.round((Math.min(P.end.getTime(), now.getTime()) - P.start.getTime()) / DAY));
    return { text: `About ${r(sum(exp) / days)} a day ${when(P.label)} (${r(sum(exp))} over ${days} days).` };
  }

  // Spending — overall, or on one thing
  const isSpendQ = has(/\b(spen\w*|spent|cost|paid|pay|how much|expenses?)\b/);
  const cleaned = q.replace(P.phrase, ' ');
  const filter = findFilter(cleaned, d.tx);
  if (!isSpendQ && !filter) {
    return { text: 'I can answer questions about your own entries. Try one of these:', detail: EXAMPLES.slice(0, 6) };
  }
  if (filter) {
    const hits = exp.filter(filter.test);
    const prevHits = inPrev.filter((t) => t.type === 'expense' && filter.test(t));
    if (hits.length === 0 && !d.tx.some(filter.test)) return { text: `Couldn’t find anything for “${filter.label}” in your entries.`, detail: ['Try the name as you wrote it in the note, or a category like Food or Travel.'] };
    const total = sum(hits);
    return {
      text: `${r(total)} on ${filter.label} ${when(P.label)}${hits.length ? ` — ${hits.length} time${hits.length > 1 ? 's' : ''}` : ''}.`,
      detail: [filter.why ?? '', change(total, sum(prevHits), P.prev?.label ?? '') ?? '', ...hits.slice(0, 4).map((t) => `${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${t.note || findCategory('expense', t.category)?.label} · ${r(t.amount)}`)].filter(Boolean),
    };
  }
  const total = sum(exp);
  return { text: `You spent ${r(total)} ${when(P.label)}.`, detail: [change(total, sum(inPrev.filter((t) => t.type === 'expense')), P.prev?.label ?? '') ?? ''].filter(Boolean), href: '/analytics', hrefLabel: 'Open analytics' };
}

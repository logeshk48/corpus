// SIPs: what's due, what's pending confirmation, what's coming this month.
// The app never sees your bank, so each month it asks "did it go through?" the day the SIP is due,
// and assumes yes after AUTO_DAYS if you don't answer (most SIPs do go through).
import type { Investment, Sip } from '@/types/investment';
import type { MoneyReminder } from './debtReminders';
import { formatINR } from './format';

export const AUTO_DAYS = 5;
const DAY = 86_400_000;
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// SIP date in a month (day capped to the month's length), 10 AM local
export function sipDate(sip: Sip, year: number, month0: number) {
  const last = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(sip.day, last), 10, 0, 0);
}
// Step-up: +x% each full year since the start
export function sipAmount(sip: Sip, on: Date) {
  if (!sip.stepUpPct) return sip.amount;
  const s = new Date(sip.start);
  const years = Math.max(0, Math.floor((on.getFullYear() - s.getFullYear()) * 12 + on.getMonth() - s.getMonth()) / 12);
  return Math.round(sip.amount * Math.pow(1 + sip.stepUpPct / 100, Math.floor(years)));
}

export type Instalment = { h: Investment; month: string; date: Date; amount: number; ageDays: number };

// Instalments whose date has passed and nobody has confirmed / skipped yet
export function pendingSips(list: Investment[], now = new Date()): Instalment[] {
  const out: Instalment[] = [];
  for (const h of list) {
    const sip = h.sip;
    if (!sip?.active) continue;
    const logged = new Set((h.sipLog ?? []).map((l) => l.month));
    const s = new Date(sip.start);
    for (let y = s.getFullYear(), m = s.getMonth(); y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth()); m === 11 ? (y++, (m = 0)) : m++) {
      const date = sipDate(sip, y, m);
      if (date < new Date(s.getFullYear(), s.getMonth(), s.getDate()) || date > now) continue;
      const month = monthKey(date);
      if (logged.has(month)) continue;
      out.push({ h, month, date, amount: sipAmount(sip, date), ageDays: Math.floor((now.getTime() - date.getTime()) / DAY) });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Next SIP date for a holding (this month if still ahead and not logged, else next month)
export function nextSip(h: Investment, now = new Date()): { date: Date; amount: number } | null {
  const sip = h.sip;
  if (!sip?.active) return null;
  const start = new Date(sip.start);
  for (let i = 0; i < 3; i++) {
    const base = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const d = sipDate(sip, base.getFullYear(), base.getMonth());
    if (d < start || d <= now) continue;
    if ((h.sipLog ?? []).some((l) => l.month === monthKey(d))) continue;
    return { date: d, amount: sipAmount(sip, d) };
  }
  return null;
}

// SIPs still to come before `until` (for "safe to spend": that money is already promised)
export function sipsDueBefore(list: Investment[], until: Date, now = new Date()) {
  return list.reduce((a, h) => {
    const n = nextSip(h, now);
    return n && n.date <= until ? a + n.amount : a;
  }, 0);
}

// Money that went into SIPs between two dates
export function sipInvested(list: Investment[], from: Date, to = new Date()) {
  let total = 0;
  for (const h of list) for (const l of h.sipLog ?? []) if (l.status === 'done' && new Date(l.date) >= from && new Date(l.date) <= to) total += l.amount;
  return total;
}

export const monthlySipTotal = (list: Investment[]) => list.reduce((a, h) => (h.sip?.active ? a + sipAmount(h.sip, new Date()) : a), 0);

// How regular you've been: done vs skipped over the last 12 months
export function sipStreak(h: Investment) {
  const log = [...(h.sipLog ?? [])].sort((a, b) => (a.month < b.month ? 1 : -1));
  let streak = 0;
  for (const l of log) {
    if (l.status !== 'done') break;
    streak++;
  }
  const last12 = log.slice(0, 12);
  return { streak, done: last12.filter((l) => l.status === 'done').length, skipped: last12.filter((l) => l.status === 'skipped').length };
}

// Home card + 9 AM phone reminders: "SIP ₹5,000 tomorrow", "Did your SIP go through?"
export function sipReminders(list: Investment[], now = new Date()): MoneyReminder[] {
  const out: MoneyReminder[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const p of pendingSips(list, now))
    out.push({ id: `sip:${p.h.id}:${p.month}:ask`, iouId: '', href: '/invest', when: new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() + 1, 9), title: `Did your ${formatINR(p.amount)} SIP go through?`, body: `${p.h.name} · tap Yes or Skipped in Invest`, urgency: 'today' });
  for (const h of list) {
    const n = nextSip(h, now);
    if (!n) continue;
    const day = new Date(n.date.getFullYear(), n.date.getMonth(), n.date.getDate());
    const days = Math.round((day.getTime() - today.getTime()) / DAY);
    out.push({
      id: `sip:${h.id}:${monthKey(n.date)}:due`,
      iouId: '',
      href: '/invest',
      when: new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 9), // the day before, 9 AM
      title: `SIP ${formatINR(n.amount)} ${days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
      body: `${h.name} · keep it in your bank so the mandate doesn't bounce`,
      urgency: days <= 0 ? 'today' : days === 1 ? 'soon' : 'later',
    });
  }
  return out;
}

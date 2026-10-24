import type { Iou } from '@/types/iou';
import { formatINR } from './format';
import { interestStatus } from './interest';
import { isOpen, remaining } from './iou';
import { chainNudges } from './debts';

// ─── Reminders for YOU: what to ask for or pay, and when ───

export type MoneyReminder = {
  id: string;            // stable: used to schedule / cancel notifications
  iouId: string;
  when: Date;            // the day it's about (9 AM)
  title: string;         // "Ask Rahul for ₹500"
  body: string;          // "Due today · Dinner"
  urgency: 'overdue' | 'today' | 'soon' | 'later';
};

const DAY = 86_400_000;
const at9 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
const dayDiff = (a: Date, b: Date) => Math.round((at9(a).getTime() - at9(b).getTime()) / DAY);

function urgencyOf(when: Date, now: Date): MoneyReminder['urgency'] {
  const d = dayDiff(when, now);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 2 ? 'soon' : 'later';
}
function relative(when: Date, now: Date) {
  const d = dayDiff(when, now);
  if (d < -1) return `${-d} days overdue`;
  if (d === -1) return 'Was due yesterday';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due ${when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export function moneyReminders(ious: Iou[], now = new Date()): MoneyReminder[] {
  const out: MoneyReminder[] = [];
  const ask = (i: Iou, amt: number) => (i.direction === 'lent' ? `Ask ${i.person} for ${formatINR(amt)}` : `Pay ${i.person} ${formatINR(amt)}`);

  for (const i of ious) {
    if (!isOpen(i)) continue;
    const left = remaining(i);
    const note = i.note ? ` · ${i.note}` : '';

    if (i.dueDate) {
      const due = at9(new Date(i.dueDate));
      out.push({ id: `${i.id}:due`, iouId: i.id, when: due, title: ask(i, left), body: `${relative(due, now)}${note}`, urgency: urgencyOf(due, now) });
    }

    const st = interestStatus(i, now);
    if (st) {
      const interestTitle = i.direction === 'lent' ? `Collect interest from ${i.person}` : `Pay interest to ${i.person}`;
      if (st.pending > 0) {
        out.push({ id: `${i.id}:int-pending`, iouId: i.id, when: at9(now), title: `${interestTitle}: ${formatINR(st.pending)}`, body: `${st.monthsBehind > 1 ? `${st.monthsBehind} months` : 'This month'} not ${i.direction === 'lent' ? 'received' : 'paid'} yet`, urgency: 'overdue' });
      }
      const next = at9(st.nextDue);
      out.push({ id: `${i.id}:int-${next.toISOString().slice(0, 10)}`, iouId: i.id, when: next, title: `${interestTitle}: ${formatINR(st.monthly)}`, body: relative(next, now), urgency: urgencyOf(next, now) });
    }

    if (i.remindAt) {
      const r = at9(new Date(i.remindAt));
      out.push({ id: `${i.id}:custom`, iouId: i.id, when: r, title: ask(i, left), body: `You asked to be reminded${note}`, urgency: urgencyOf(r, now) === 'overdue' ? 'today' : urgencyOf(r, now) });
    }
  }

  for (const n of chainNudges(ious)) {
    out.push({ id: `${n.borrowed.id}:chain`, iouId: n.borrowed.id, when: at9(now), title: `Repay ${n.borrowed.person} ${formatINR(n.repayNow)}`, body: `${n.lent.person} paid you back. Pass it on`, urgency: 'today' });
  }

  const rank = { overdue: 0, today: 1, soon: 2, later: 3 };
  return out.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.when.getTime() - b.when.getTime());
}

// What needs attention now (Home card): overdue, today, next 2 days
export const actionable = (list: MoneyReminder[]) => list.filter((r) => r.urgency !== 'later');

// Phone notifications to schedule: future moments in the next 45 days.
// Each reminder fires on the day (9 AM) and, for due dates, also the day before.
export function notificationsToSchedule(list: MoneyReminder[], now = new Date()) {
  const horizon = now.getTime() + 45 * DAY;
  const out: { id: string; date: Date; title: string; body: string }[] = [];
  for (const r of list) {
    const t = r.when.getTime();
    if (t > now.getTime() && t < horizon) out.push({ id: r.id, date: r.when, title: r.title, body: r.body });
    const eve = t - DAY;
    if (!r.id.endsWith(':custom') && eve > now.getTime() && eve < horizon) {
      out.push({ id: `${r.id}:eve`, date: new Date(eve), title: r.title, body: r.body.replace('Due ', 'Due tomorrow, ').replace('Due tomorrow, today', 'Due tomorrow') });
    }
  }
  return out;
}

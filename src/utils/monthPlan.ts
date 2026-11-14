// Monthly review: a verdict for last month + the 3 things worth doing this month.
// Plain rules on your own data — every suggestion comes with a one-tap action.
import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';
import { formatINR } from './format';
import type { MonthReport } from './monthReport';

export type PlanAction =
  | { kind: 'catBudget'; category: string; limit: number }
  | { kind: 'budget'; amount: number }
  | { kind: 'notify' }
  | { kind: 'route'; href: string };
export type PlanItem = { id: string; title: string; body: string; cta: string; act: PlanAction };

const r = (n: number) => formatINR(Math.round(n));
const up = (n: number, step: number) => Math.ceil(n / step) * step;
const shift = (k: string, d: number) => {
  const [y, m] = k.split('-').map(Number);
  const x = new Date(y, m - 1 + d, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
};

export function monthVerdict(r0: MonthReport) {
  if (!r0.income) return { tone: 'neutral' as const, text: `Here’s how ${r0.name} went` };
  const pct = Math.round((r0.rate ?? 0) * 100);
  if (r0.saved < 0) return { tone: 'bad' as const, text: `You spent ${r(-r0.saved)} more than you earned` };
  if (pct >= 20 && !(r0.overBudget != null && r0.overBudget > 0)) return { tone: 'good' as const, text: `Good month — you kept ${pct}% of your income` };
  return { tone: 'ok' as const, text: `Okay month — you kept ${pct}% of your income` };
}

export function monthPlan(p: {
  r: MonthReport; tx: Transaction[];
  monthlyBudget?: number; categoryBudgets?: Record<string, number>;
  dailyReminderOn: boolean; idleCash: number; hasEmergencyJar: boolean; hasSip: boolean;
}): PlanItem[] {
  const { r: rep } = p;
  const out: PlanItem[] = [];
  const m = rep.month;
  const before = [shift(m, -1), shift(m, -2), shift(m, -3)];
  const cat = new Map<string, { now: number; prev: number[] }>();
  for (const t of p.tx) {
    if (t.type !== 'expense') continue;
    const mk = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}`;
    const e = cat.get(t.category) ?? { now: 0, prev: [0, 0, 0] };
    if (mk === m) e.now += t.amount;
    const i = before.indexOf(mk);
    if (i >= 0) e.prev[i] += t.amount;
    cat.set(t.category, e);
  }
  const usualOf = (e: { prev: number[] }) => {
    const seen = e.prev.filter((x) => x > 0);
    return seen.length ? seen.reduce((a, b) => a + b, 0) / seen.length : 0;
  };

  // 1. A category that ran well above its usual
  const rises = [...cat.entries()]
    .map(([c, e]) => ({ c, now: e.now, usual: usualOf(e), limit: p.categoryBudgets?.[c] }))
    .filter((x) => x.usual > 0 && x.now - x.usual > 1000 && x.now > x.usual * 1.2)
    .sort((a, b) => b.now - b.usual - (a.now - a.usual));
  const rise = rises[0];
  if (rise) {
    const label = findCategory('expense', rise.c)?.label ?? rise.c;
    if (rise.limit) {
      if (rise.now > rise.limit) out.push({ id: `cat-over:${rise.c}`, title: `${label} went over its limit`, body: `${r(rise.now)} against a ${r(rise.limit)} limit (usually ${r(rise.usual)}). Check what pushed it up.`, cta: 'See budgets', act: { kind: 'route', href: '/budgets' } });
    } else {
      const limit = up(rise.usual, 500);
      out.push({ id: `cat:${rise.c}`, title: `${label} was ${r(rise.now - rise.usual)} above usual`, body: `You spent ${r(rise.now)}; usually about ${r(rise.usual)}. A ${r(limit)} limit warns you before it happens again.`, cta: `Set ${r(limit)} limit`, act: { kind: 'catBudget', category: rise.c, limit } });
    }
  }

  // 2. Overall budget
  if (rep.overBudget != null && rep.overBudget > 0) {
    out.push({ id: 'over', title: `${r(rep.overBudget)} over your monthly budget`, body: 'Look at the categories with the biggest jump, and give the worst one its own limit.', cta: 'See budgets', act: { kind: 'route', href: '/budgets' } });
  } else if (!p.monthlyBudget && rep.spent > 0) {
    const all = [rep.spent, ...before.map((k) => [...cat.values()].reduce((a, e) => a + e.prev[before.indexOf(k)], 0))].filter((x) => x > 0);
    let amt = up(all.reduce((a, b) => a + b, 0) / all.length, 1000);
    if (rep.income) amt = Math.min(amt, up(rep.income * 0.8, 1000));
    out.push({ id: 'budget', title: 'Give the month a spending limit', body: `You usually spend about ${r(all.reduce((a, b) => a + b, 0) / all.length)}. A ${r(amt)} budget makes safe-to-spend stricter when you need it.`, cta: `Set ${r(amt)} budget`, act: { kind: 'budget', amount: amt } });
  }

  // 3. Saving / investing
  if (rep.income > 0 && rep.rate != null && rep.rate < 0.2) {
    const gap = up(rep.income * 0.2 - Math.max(0, rep.saved), 500);
    out.push({ id: 'save', title: 'Pay yourself first', body: `Keeping 20% would mean ${r(gap)} more a month. Move it into a jar on pay day, before spending starts.`, cta: 'Open jars', act: { kind: 'route', href: '/vaults' } });
  } else if (rep.income > 0 && rep.saved >= 5000 && !p.hasSip && rep.invested === 0) {
    const sip = up(rep.saved * 0.5, 500);
    out.push({ id: 'sip', title: `Put ${r(sip)} a month to work`, body: `You saved ${r(rep.saved)} but none of it was invested. A monthly SIP of about half of that grows with you.`, cta: 'Start a SIP', act: { kind: 'route', href: '/invest' } });
  }

  // 4. Safety net and idle money
  if (!p.hasEmergencyJar && rep.spent > 0) {
    out.push({ id: 'emergency', title: 'Start an emergency fund', body: `Aim for 3 months of spending (${r(rep.spent * 3)}). A jar keeps it apart from everyday money.`, cta: 'Open jars', act: { kind: 'route', href: '/vaults' } });
  } else if (p.idleCash >= 25000) {
    out.push({ id: 'idle', title: `${r(p.idleCash)} is sitting idle`, body: 'That’s beyond 3 months of spending and your bills. A liquid fund or your SIPs would earn more than a savings account.', cta: 'See wealth', act: { kind: 'route', href: '/wealth' } });
  }

  // 5. Logging gaps make every number wrong
  if (rep.loggedDays < rep.daysIn * 0.6 && !p.dailyReminderOn) {
    out.unshift({ id: 'log', title: `Logged on only ${rep.loggedDays} of ${rep.daysIn} days`, body: 'The numbers above are probably low. An evening reminder makes logging a 10-second habit.', cta: 'Turn on reminder', act: { kind: 'notify' } });
  }
  return out.slice(0, 3);
}

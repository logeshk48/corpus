import type { Transaction } from '@/types/transaction';
import type { Vault, VaultEntry, VaultKind, VaultWithBalance } from '@/types/vault';

// ── Helpers ────────────────────────────────────────────────

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

export function parseYearMonth(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function formatYearMonth(ym: string): string {
  return parseYearMonth(ym).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Older jars have no `kind` — infer it from the name
export function jarKind(v: Vault): VaultKind {
  if (v.kind) return v.kind;
  const n = v.name.toLowerCase();
  if (n.includes('tax')) return 'tax';
  if (n.includes('emergency')) return 'emergency';
  if (n.includes('saving')) return 'savings';
  return 'goal';
}

// ── 1. Monthly plan: "save ₹X/month to reach the goal by <date>" ──

export type JarPlan = {
  perMonth: number;    // needed each month from now (this month included)
  monthsLeft: number;
  addedThisMonth: number;
  status: 'done' | 'onTrack' | 'behind' | 'overdue';
  shortThisMonth: number; // how much more is needed this month
};

export function jarPlan(jar: VaultWithBalance, now: Date = new Date()): JarPlan | null {
  if (!jar.goal || !jar.targetDate) return null;
  const remaining = jar.goal - jar.balance;
  const monthsLeft = monthIndex(parseYearMonth(jar.targetDate)) - monthIndex(now) + 1;

  if (remaining <= 0) {
    return { perMonth: 0, monthsLeft, addedThisMonth: jar.addedThisMonth, status: 'done', shortThisMonth: 0 };
  }
  if (monthsLeft <= 0) {
    return { perMonth: remaining, monthsLeft: 0, addedThisMonth: jar.addedThisMonth, status: 'overdue', shortThisMonth: remaining };
  }
  // What was needed at the START of this month (this month's deposits count towards it)
  const perMonth = Math.ceil((remaining + jar.addedThisMonth) / monthsLeft);
  const shortThisMonth = Math.max(perMonth - jar.addedThisMonth, 0);
  return {
    perMonth,
    monthsLeft,
    addedThisMonth: jar.addedThisMonth,
    status: shortThisMonth === 0 ? 'onTrack' : 'behind',
    shortThisMonth,
  };
}

// ── 2. Projection: "at your pace you'll finish around <month>" ──

export function projectedFinish(jar: VaultWithBalance, entries: VaultEntry[], now: Date = new Date()): string | null {
  if (!jar.goal || jar.balance >= jar.goal) return null;
  // Average NET saving per month over the last 3 months (incl. this one)
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  let net = 0;
  for (const e of entries) {
    if (e.vaultId !== jar.id || e.date < from) continue;
    net += e.type === 'in' ? e.amount : -e.amount;
  }
  const perMonth = net / 3;
  if (perMonth <= 0) return null;
  const months = Math.ceil((jar.goal - jar.balance) / perMonth);
  if (months > 120) return null; // more than 10 years — not useful
  return toYearMonth(new Date(now.getFullYear(), now.getMonth() + months - 1, 1));
}

// ── 3. Milestones 25 / 50 / 75 / 100% ──

export const MILESTONES = [25, 50, 75, 100] as const;

export function milestoneReached(balance: number, goal?: number): number {
  if (!goal || goal <= 0) return 0;
  const pct = (balance / goal) * 100;
  return [...MILESTONES].reverse().find((m) => pct >= m) ?? 0;
}

// ── 4. Saving streak: consecutive months with at least one deposit ──

export function savingStreak(entries: VaultEntry[], now: Date = new Date()): number {
  const months = new Set(entries.filter((e) => e.type === 'in').map((e) => toYearMonth(new Date(e.date))));
  let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  // This month doesn't break the streak yet if you haven't saved so far
  if (!months.has(toYearMonth(cursor))) cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  let streak = 0;
  while (months.has(toYearMonth(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  }
  return streak;
}

// ── 5. Emergency fund: months of expenses covered ──
// Guidance (India): 3–6 months for stable salaried, 6–12 for freelancers / business.

export function averageMonthlyExpenses(transactions: Transaction[], now: Date = new Date()): number {
  // Last 3 COMPLETE months that have any spending
  const totals = new Map<number, number>();
  const thisMonth = monthIndex(now);
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const mi = monthIndex(new Date(t.date));
    if (mi >= thisMonth || mi < thisMonth - 3) continue;
    totals.set(mi, (totals.get(mi) ?? 0) + t.amount);
  }
  if (totals.size === 0) {
    // Fall back to this month's spending so far, projected to a full month
    const spentSoFar = transactions
      .filter((t) => t.type === 'expense' && monthIndex(new Date(t.date)) === thisMonth)
      .reduce((s, t) => s + t.amount, 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return spentSoFar > 0 ? Math.round((spentSoFar / now.getDate()) * daysInMonth) : 0;
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return Math.round(sum / totals.size);
}

export function recommendedEmergencyMonths(transactions: Transaction[]): number {
  // Any non-salary income in the last year → treat as irregular income
  const irregular = transactions.some((t) => t.type === 'income' && t.category !== 'salary');
  return irregular ? 9 : 6;
}

// ── 6. Tax jar: next advance-tax instalment (India) ──
// Cumulative: 15 Jun 15% · 15 Sep 45% · 15 Dec 75% · 15 Mar 100%

export function nextAdvanceTax(now: Date = new Date()) {
  const y = now.getFullYear();
  const today = new Date(y, now.getMonth(), now.getDate());
  const candidates = [
    { date: new Date(y, 2, 15), percent: 100 },
    { date: new Date(y, 5, 15), percent: 15 },
    { date: new Date(y, 8, 15), percent: 45 },
    { date: new Date(y, 11, 15), percent: 75 },
    { date: new Date(y + 1, 2, 15), percent: 100 },
  ];
  const next = candidates.find((c) => c.date >= today)!;
  const daysLeft = Math.round((next.date.getTime() - today.getTime()) / 86400000);
  return {
    date: next.date,
    label: next.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    percent: next.percent,
    daysLeft,
  };
}

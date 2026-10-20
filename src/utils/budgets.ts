import { EXPENSE_CATEGORIES } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';

export type BudgetState = 'ok' | 'warning' | 'over';

export type BudgetStatus = {
  categoryId: string;
  label: string;
  icon: string;
  limit: number;
  spent: number;
  remaining: number; // negative when over budget
  percent: number;   // can exceed 100
  state: BudgetState;
};

export const WARNING_PERCENT = 80;

export function budgetState(spent: number, limit: number): BudgetState {
  if (spent > limit) return 'over';
  if (limit > 0 && (spent / limit) * 100 >= WARNING_PERCENT) return 'warning';
  return 'ok';
}

// Total expense per category id, e.g. Map { food → 6200, travel → 3450 }
export function spentByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return totals;
}

// One status per category that HAS a limit, most-used first
export function buildBudgetStatuses(
  transactions: Transaction[],
  budgets: Record<string, number> | undefined
): BudgetStatus[] {
  if (!budgets) return [];
  const spent = spentByCategory(transactions);
  const statuses: BudgetStatus[] = [];

  for (const cat of EXPENSE_CATEGORIES) {
    const limit = budgets[cat.id];
    if (!limit || limit <= 0) continue;
    const s = spent.get(cat.id) ?? 0;
    statuses.push({
      categoryId: cat.id,
      label: cat.label,
      icon: cat.icon,
      limit,
      spent: s,
      remaining: limit - s,
      percent: (s / limit) * 100,
      state: budgetState(s, limit),
    });
  }
  return statuses.sort((a, b) => b.percent - a.percent);
}

// The overall monthly budget (from Settings), or null if none is set
export function overallBudget(transactions: Transaction[], monthlyBudget: number | undefined) {
  if (!monthlyBudget || monthlyBudget <= 0) return null;
  const spent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    limit: monthlyBudget,
    spent,
    remaining: monthlyBudget - spent,
    percent: (spent / monthlyBudget) * 100,
    state: budgetState(spent, monthlyBudget),
  };
}

// ── Pace & planning helpers (Budgets screen) ────────────────

// Fraction of the month that has passed, counting today (e.g. 20 Oct → 20/31)
export function monthProgress(now: Date = new Date()): number {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() / daysInMonth;
}

// How much you can spend per day for the rest of the month
export function perDayLeft(remaining: number, now: Date = new Date()): number {
  if (remaining <= 0) return 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  return remaining / daysLeft;
}

export type Pace = 'onTrack' | 'fast' | 'over';

// Compare spending with where you "should" be at this point in the month
export function spendingPace(spent: number, limit: number, now: Date = new Date()): Pace {
  if (spent > limit) return 'over';
  const expectedByNow = limit * monthProgress(now);
  return spent > expectedByNow * 1.1 ? 'fast' : 'onTrack';
}

// Suggest a limit from your current pace: projected month spend, rounded up to ₹500
export function suggestLimit(spent: number, now: Date = new Date()): number | null {
  if (spent <= 0) return null;
  const projected = spent / monthProgress(now);
  return Math.ceil(projected / 500) * 500;
}

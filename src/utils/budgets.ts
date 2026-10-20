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

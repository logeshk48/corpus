import type { Transaction } from '@/types/transaction';
import type { VaultWithBalance } from '@/types/vault';
import { jarPlan } from './jarInsights';

export type SafeStatus = 'ok' | 'tight' | 'over';

export type SafeToSpendResult =
  | { status: 'noData' }
  | {
      status: SafeStatus;
      safeToday: number;        // what you can still spend today (can be negative)
      dailyAllowance: number;   // today's full allowance, before today's spending
      tomorrowAllowance: number;// per-day amount from tomorrow if you stop spending now
      available: number;        // money left for the rest of the month
      daysLeft: number;         // including today
      income: number;
      spent: number;
      spentToday: number;
      movedToJars: number;      // net: added − taken out, this month
      plansDue: number;         // jar plans still needed this month
      limitedByBudget: boolean; // the monthly budget was the stricter limit
      monthlyBudget?: number;
    };

type Input = {
  monthTransactions: Transaction[]; // this month only
  jars: VaultWithBalance[];
  monthlyBudget?: number;
  now?: Date;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function computeSafeToSpend({ monthTransactions, jars, monthlyBudget, now = new Date() }: Input): SafeToSpendResult {
  let income = 0;
  let spent = 0;
  let spentToday = 0;
  for (const t of monthTransactions) {
    if (t.type === 'income') income += t.amount;
    else {
      spent += t.amount;
      if (sameDay(new Date(t.date), now)) spentToday += t.amount;
    }
  }

  const movedToJars = jars.reduce((s, j) => s + j.addedThisMonth - j.takenThisMonth, 0);
  const plansDue = jars.reduce((s, j) => {
    const p = jarPlan(j, now);
    return p && p.status === 'behind' ? s + p.shortThisMonth : s; // overdue plans don't swallow the month
  }, 0);

  const incomeBased = income > 0 ? income - spent - movedToJars - plansDue : null;
  const budgetBased = monthlyBudget && monthlyBudget > 0 ? monthlyBudget - spent : null;
  if (incomeBased === null && budgetBased === null) return { status: 'noData' };

  const limitedByBudget = budgetBased !== null && (incomeBased === null || budgetBased < incomeBased);
  const available = limitedByBudget ? budgetBased! : incomeBased!;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;

  // Today's allowance is fixed at the START of today, so spending today counts against it
  const availableAtStartOfToday = available + spentToday;
  const dailyAllowance = Math.max(availableAtStartOfToday, 0) / daysLeft;
  const safeToday = availableAtStartOfToday > 0 ? dailyAllowance - spentToday : available;
  const tomorrowAllowance = daysLeft > 1 ? Math.max(available, 0) / (daysLeft - 1) : 0;

  let status: SafeStatus = 'ok';
  if (safeToday < 0 || available < 0) status = 'over';
  else if (safeToday < dailyAllowance * 0.3) status = 'tight';

  return {
    status,
    safeToday: Math.floor(safeToday),
    dailyAllowance: Math.floor(dailyAllowance),
    tomorrowAllowance: Math.floor(tomorrowAllowance),
    available: Math.floor(available),
    daysLeft,
    income,
    spent,
    spentToday,
    movedToJars,
    plansDue,
    limitedByBudget,
    monthlyBudget,
  };
}

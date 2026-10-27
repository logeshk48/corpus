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
      setAside: number;         // money you told Corpus not to count
      billsDue: number;         // recurring bills not yet paid this month
      limitedByBudget: boolean; // the monthly budget was the stricter limit
      monthlyBudget?: number;
    };

type Input = {
  monthTransactions: Transaction[]; // this month only
  jars: VaultWithBalance[];
  monthlyBudget?: number;
  billsDue?: number; // unpaid recurring bills this month
  setAside?: number; // money you keep aside, never counted as spendable
  cycleStartDay?: number; // your month starts on this day (pay day)
  now?: Date;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function computeSafeToSpend({
  monthTransactions,
  jars,
  monthlyBudget,
  billsDue = 0,
  setAside = 0,
  cycleStartDay = 1,
  now = new Date(),
}: Input): SafeToSpendResult {
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

  // Unpaid bills are reserved in BOTH limits — that money is already promised
  const keep = Math.max(0, setAside);
  const incomeBased = income > 0 ? income - spent - movedToJars - plansDue - billsDue - keep : null;
  const budgetBased = monthlyBudget && monthlyBudget > 0 ? monthlyBudget - spent - billsDue - keep : null;
  if (incomeBased === null && budgetBased === null) return { status: 'noData' };

  const limitedByBudget = budgetBased !== null && (incomeBased === null || budgetBased < incomeBased);
  const available = limitedByBudget ? budgetBased! : incomeBased!;

  // days left in YOUR cycle (pay day to pay day when set)
  const startDay = Math.min(Math.max(1, Math.round(cycleStartDay)), 28);
  const cycleStart = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= startDay ? 0 : -1), startDay);
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, startDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.max(1, Math.round((cycleEnd.getTime() - today.getTime()) / 86_400_000));

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
    billsDue,
    setAside: keep,
    limitedByBudget,
    monthlyBudget,
  };
}

import type { Account } from '@/types/account';
import type { Transaction } from '@/types/transaction';

// ─── Account balances from your transactions ───
// Bank / cash / wallet: opening + money in − money out
// Credit card: what you OWE = opening + spends − refunds/payments

export type AccountBalance = Account & {
  balance: number;     // for credit: amount owed
  monthIn: number;
  monthOut: number;
  txCount: number;
};

export function accountBalances(accounts: Account[], tx: Transaction[], now = new Date()): AccountBalance[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return accounts.map((a) => {
    const from = new Date(a.openingDate).getTime();
    let inSum = 0, outSum = 0, monthIn = 0, monthOut = 0, txCount = 0;
    for (const t of tx) {
      if (t.accountId !== a.id) continue;
      const when = new Date(t.date).getTime();
      if (when < from) continue;
      txCount++;
      if (t.type === 'income') inSum += t.amount;
      else outSum += t.amount;
      if (when >= monthStart) t.type === 'income' ? (monthIn += t.amount) : (monthOut += t.amount);
    }
    const balance = a.type === 'credit' ? a.opening + outSum - inSum : a.opening + inSum - outSum;
    return { ...a, balance: Math.round(balance * 100) / 100, monthIn, monthOut, txCount };
  });
}

export function accountTotals(list: AccountBalance[]) {
  const live = list.filter((a) => !a.archived);
  const have = live.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
  const cardDues = live.filter((a) => a.type === 'credit').reduce((s, a) => s + Math.max(0, a.balance), 0);
  return { have, cardDues, net: have - cardDues };
}

// Transactions not tied to any account (older entries, bill auto-logs) — shown as a nudge
export const unassignedCount = (tx: Transaction[], accounts: Account[]) =>
  accounts.length === 0 ? 0 : tx.filter((t) => !t.accountId).length;

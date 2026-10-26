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

// ─── Light accounts: balances you confirm about once a week ───
const DAY = 86_400_000;

export function verifiedAgo(a: Account, now = new Date()) {
  const at = a.verifiedAt ?? a.openingDate;
  const days = Math.floor((now.getTime() - new Date(at).getTime()) / DAY);
  return { days, stale: days >= 7, label: days <= 0 ? 'verified today' : days === 1 ? 'verified yesterday' : `verified ${days} days ago` };
}

function onDay(year: number, month: number, day: number) {
  return new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()), 9);
}

// Next card bill: generated on statementDay, payable by dueDay (usually the following month)
export function nextCardDue(a: Account, now = new Date()) {
  if (a.type !== 'credit' || !a.dueDay) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let due = onDay(now.getFullYear(), now.getMonth(), a.dueDay);
  if (due < today) due = onDay(now.getFullYear(), now.getMonth() + 1, a.dueDay);
  let statement: Date | undefined;
  if (a.statementDay) {
    statement = onDay(due.getFullYear(), due.getMonth(), a.statementDay);
    if (statement >= due) statement = onDay(due.getFullYear(), due.getMonth() - 1, a.statementDay);
  }
  const daysLeft = Math.round((due.getTime() - today.getTime() - 9 * 3_600_000) / DAY);
  return { due, statement, daysLeft };
}

// Reminders shaped like money reminders so Home + phone notifications can show them together
export function cardReminders(list: AccountBalance[], now = new Date()) {
  const out: { id: string; iouId: string; when: Date; title: string; body: string; urgency: 'overdue' | 'today' | 'soon' | 'later' }[] = [];
  for (const a of list) {
    const n = nextCardDue(a, now);
    if (!n || a.balance <= 0 || a.archived) continue;
    out.push({
      id: `card:${a.id}:${n.due.toISOString().slice(0, 10)}`,
      iouId: a.id,
      when: n.due,
      title: `Pay ${a.name} bill`,
      body: `${n.daysLeft === 0 ? 'Due today' : n.daysLeft === 1 ? 'Due tomorrow' : `Due in ${n.daysLeft} days`} · about ₹${Math.round(a.balance).toLocaleString('en-IN')} owed`,
      urgency: n.daysLeft === 0 ? 'today' : n.daysLeft <= 3 ? 'soon' : 'later',
    });
  }
  return out;
}

// New check-in history entry list (one per day, newest last, max 60)
export function withCheckin(a: Account, balance: number, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const list = (a.checkins ?? []).filter((c) => c.date.slice(0, 10) !== day);
  return [...list, { date: now.toISOString(), balance }].slice(-60);
}

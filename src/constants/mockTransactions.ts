import type { Transaction } from '@/types/transaction';
export type { Transaction } from '@/types/transaction';

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'expense', amount: 60,    category: 'food',     note: 'Filter coffee',   date: '2026-07-09T17:40:00' },
  { id: 't2', type: 'expense', amount: 45,    category: 'travel',   note: 'Metro to office', date: '2026-07-09T09:05:00' },
  { id: 't3', type: 'expense', amount: 299,   category: 'bills',    note: 'Mobile recharge', date: '2026-07-08T11:20:00' },
  { id: 't4', type: 'income',  amount: 45000, category: 'client',   note: 'Zenith Studio',   date: '2026-07-08T10:00:00' },
  { id: 't5', type: 'expense', amount: 850,   category: 'shopping', note: 'T-shirt',         date: '2026-07-07T19:30:00' },
];
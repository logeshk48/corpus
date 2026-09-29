export type TxType = 'expense' | 'income';

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string;          // ISO string: when the money moved
  recurringId?: string;  // set later for auto-logged bills (Day 23)
};

// What we send to Firestore when creating one (no id yet, since Firestore generates it)
export type NewTransaction = Omit<Transaction, 'id'>;
export type TxType = 'expense' | 'income';

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note?: string;
  date: string;          // ISO string: when the money moved
  streamId?: string;     // income only: which income stream it came from
  accountId?: string;    // which account the money moved in/out of (cash, bank, card…)
  recurringId?: string;  // set when auto-logged from a recurring bill (bills/{id})
};

// What we send to Firestore when creating one (no id yet, since Firestore generates it)
export type NewTransaction = Omit<Transaction, 'id'>;
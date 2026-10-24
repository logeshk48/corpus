// Money between you and someone else: you lent it, or you borrowed it.
export type IouDirection = 'lent' | 'borrowed';

export type Repayment = { amount: number; date: string }; // ISO date

export type Iou = {
  id: string;
  person: string;          // "Rahul"
  direction: IouDirection; // lent = they owe you · borrowed = you owe them
  amount: number;          // original amount, INR
  note?: string;           // "Dinner at Saravana"
  date: string;            // ISO, when it happened
  dueDate?: string;        // ISO, optional "pay back by"
  repayments?: Repayment[];// partial paybacks
  settledAt?: string;      // ISO, set when fully paid back
};

export type NewIou = Omit<Iou, 'id'>;

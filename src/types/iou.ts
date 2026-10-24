// Money between you and someone else: you lent it, or you borrowed it.
export type IouDirection = 'lent' | 'borrowed';
// loan = expected back · support = helping family (tracked, never "owed") · gift = shagun / present
export type IouKind = 'loan' | 'support' | 'gift';

export type Repayment = { amount: number; date: string }; // ISO date

export type Iou = {
  id: string;
  person: string;          // "Rahul"
  direction: IouDirection; // lent = they owe you · borrowed = you owe them
  kind?: IouKind;          // default 'loan'
  amount: number;          // original amount, INR
  note?: string;           // "Dinner at Saravana"
  date: string;            // ISO, when it happened
  dueDate?: string;        // ISO, optional "pay back by"
  repayments?: Repayment[];// partial paybacks
  settledAt?: string;      // ISO, set when fully paid back
  // Interest-only hand loan: "₹2 per ₹100 per month". Interest is paid monthly and
  // does NOT reduce the amount; only repayments (principal) do.
  ratePerHundred?: number;        // ₹ per ₹100 per month, e.g. 2 → 24% a year
  interestPayments?: Repayment[];
  instalment?: number;     // paid back ₹X per month (e.g. maid advance, friend's EMI)
  onCard?: boolean;        // it's an EMI running on YOUR credit card for them
  proofRef?: string;       // UPI ref / cheque no. / any proof note
  remindAt?: string;       // ISO: "remind me" date the user picked
  linkedId?: string;       // chain: the borrowed entry and the lent entry it funded point at each other
};

export type NewIou = Omit<Iou, 'id'>;

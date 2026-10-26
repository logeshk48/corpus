export type AccountType = 'cash' | 'bank' | 'wallet' | 'credit';

export type Account = {
  id: string;
  name: string;            // "HDFC Savings", "Cash", "Paytm", "SBI Card"
  type: AccountType;
  opening: number;         // balance on openingDate (for a credit card: amount owed then)
  openingDate: string;     // ISO — only transactions from this moment count
  creditLimit?: number;    // credit cards
  statementDay?: number;   // 1–31: day the card bill is generated
  dueDay?: number;         // 1–31: day the card bill must be paid
  archived?: boolean;
  verifiedAt?: string;     // ISO: last time you confirmed the balance from your bank/card app
  checkins?: { date: string; balance: number }[]; // balance history (newest last, max 60)
};

export type NewAccount = Omit<Account, 'id'>;

export const ACCOUNT_TYPES: { id: AccountType; label: string; icon: string; hint: string }[] = [
  { id: 'cash', label: 'Cash', icon: 'cash-outline', hint: 'Money in your wallet' },
  { id: 'bank', label: 'Bank', icon: 'business-outline', hint: 'Savings / salary account (UPI goes here)' },
  { id: 'wallet', label: 'Wallet', icon: 'phone-portrait-outline', hint: 'Paytm, Amazon Pay, PhonePe wallet' },
  { id: 'credit', label: 'Credit card', icon: 'card-outline', hint: 'Track what you owe and the bill date' },
];

export const accountTypeMeta = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.id === t) ?? ACCOUNT_TYPES[0];

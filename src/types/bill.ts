export type Bill = {
  id: string;
  name: string;            // "Rent", "Netflix", "Bike EMI"
  amount: number;          // INR
  category: string;        // expense category id, e.g. "bills"
  dayOfMonth: number;      // 1–31 (31 means "last day" in shorter months)
  active: boolean;         // paused bills are not logged or reserved
  startMonth: string;      // 'YYYY-MM' — first month this bill applies
  lastLoggedMonth?: string; // 'YYYY-MM' — the month it was last recorded or skipped (prevents double logging)
  lastSkippedMonth?: string; // 'YYYY-MM' — set when you chose "skip this month"
  frequency?: BillFrequency; // default 'monthly'
  dueMonth?: number;       // 1–12: for yearly bills the month it's due; for quarterly the first month of the cycle
  variable?: boolean;      // amount changes each time (electricity) → Corpus asks instead of auto-logging
  endMonth?: string;       // 'YYYY-MM' — month of the LAST payment (loans / EMIs); none = forever
  loan?: Loan;             // optional loan details → balance, interest split, prepayment calculator
};

export type BillFrequency = 'monthly' | 'quarterly' | 'yearly';

export type NewBill = Omit<Bill, 'id'>;

export type LoanType = 'home' | 'car' | 'bike' | 'personal' | 'education' | 'gadget' | 'other';

export type Prepayment = {
  date: string;   // ISO
  amount: number; // INR
  mode: 'tenure' | 'emi'; // reduce the tenure (keep EMI) or reduce the EMI (keep tenure)
};

export type Loan = {
  principal: number;      // original loan amount
  annualRate: number;     // % per year, e.g. 8.5
  tenureMonths: number;   // original number of EMIs
  firstEmiMonth: string;  // 'YYYY-MM' of the first EMI
  type?: LoanType;
  lender?: string;
  prepayments?: Prepayment[];
};


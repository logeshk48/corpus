export type Bill = {
  id: string;
  name: string;            // "Rent", "Netflix", "Bike EMI"
  amount: number;          // INR
  category: string;        // expense category id, e.g. "bills"
  dayOfMonth: number;      // 1–31 (31 means "last day" in shorter months)
  active: boolean;         // paused bills are not logged or reserved
  startMonth: string;      // 'YYYY-MM' — first month this bill applies
  lastLoggedMonth?: string; // 'YYYY-MM' — the month it was last recorded (prevents double logging)
};

export type NewBill = Omit<Bill, 'id'>;

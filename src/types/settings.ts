// How the person earns. Several can be true at once
// (e.g. a salaried developer who also freelances on weekends).
export type WorkMode = 'salaried' | 'freelancer' | 'founder';

export type Settings = {
  displayName?: string;   // shown in the Home greeting
  workModes?: WorkMode[]; // chosen during onboarding
  onboardedAt?: string;
  defaultAccountId?: string;
  checkinTotals?: { date: string; net: number }[]; // money you have − card dues, at each "Update balances" (max 26) // pre-selected in Add
  setAside?: number;        // money in your account that is NOT for spending this month
  cycleStartDay?: number;   // 1–28: your month starts on pay day, not the 1st
  // Phone notification types — missing means ON
  notify?: { people?: boolean; cards?: boolean; checkin?: boolean; budget?: boolean };
  upiId?: string;          // added to lent-money reminders, e.g. name@okaxis
  phones?: Record<string, string>; // person key (lowercase name) → mobile number, for WhatsApp reminders   // ISO — set when first-run setup is finished or skipped
  monthlyBudget?: number; // total spending budget per month, in INR
  categoryBudgets?: Record<string, number>; // expense category id → monthly limit, e.g. { food: 8000 }
  currency: 'INR';
};

// Used before the first save, and to fill any missing fields
export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
};

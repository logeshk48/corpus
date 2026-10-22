// How the person earns. Several can be true at once
// (e.g. a salaried developer who also freelances on weekends).
export type WorkMode = 'salaried' | 'freelancer' | 'founder';

export type Settings = {
  displayName?: string;   // shown in the Home greeting
  workModes?: WorkMode[]; // chosen during onboarding
  onboardedAt?: string;   // ISO — set when first-run setup is finished or skipped
  monthlyBudget?: number; // total spending budget per month, in INR
  categoryBudgets?: Record<string, number>; // expense category id → monthly limit, e.g. { food: 8000 }
  currency: 'INR';
};

// Used before the first save, and to fill any missing fields
export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
};

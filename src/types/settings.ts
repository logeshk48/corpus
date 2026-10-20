export type Settings = {
  displayName?: string;   // shown in the Home greeting
  monthlyBudget?: number; // total spending budget per month, in INR
  currency: 'INR';
};

// Used before the first save, and to fill any missing fields
export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
};

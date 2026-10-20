export type Settings = {
  displayName?: string;   // shown in the Home greeting
  monthlyBudget?: number; // total spending budget per month, in INR
  categoryBudgets?: Record<string, number>; // expense category id → monthly limit, e.g. { food: 8000 }
  taxVaultPercent?: number;     // % of taxable income set aside for tax (0–50)
  savingsVaultPercent?: number; // % of ALL income set aside for savings (0–80)
  taxIncludesSalary?: boolean;  // default false: salary usually already has TDS
  vaultMoved?: Record<string, { tax?: number; savings?: number }>; // 'YYYY-MM' → amount you marked as moved
  currency: 'INR';
};

// Used before the first save, and to fill any missing fields
export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
};

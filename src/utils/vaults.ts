import type { Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';

export type VaultTotals = {
  totalIncome: number;   // all income in the period
  taxableIncome: number; // income the tax vault applies to
  tax: number;           // set aside for tax
  savings: number;       // set aside for savings
  reserved: number;      // tax + savings
  spendableIncome: number; // income after both vaults
};

// Is this income transaction counted by the tax vault?
export function isTaxable(tx: Transaction, includeSalary: boolean): boolean {
  if (tx.type !== 'income') return false;
  return includeSalary || tx.category !== 'salary';
}

// Vault amounts for a set of transactions (e.g. this month, this year)
export function vaultTotals(transactions: Transaction[], settings: Settings): VaultTotals {
  const taxPct = settings.taxVaultPercent ?? 0;
  const savingsPct = settings.savingsVaultPercent ?? 0;
  const includeSalary = settings.taxIncludesSalary ?? false;

  let totalIncome = 0;
  let taxableIncome = 0;
  for (const t of transactions) {
    if (t.type !== 'income') continue;
    totalIncome += t.amount;
    if (isTaxable(t, includeSalary)) taxableIncome += t.amount;
  }

  const tax = Math.round((taxableIncome * taxPct) / 100);
  const savings = Math.round((totalIncome * savingsPct) / 100);
  return {
    totalIncome,
    taxableIncome,
    tax,
    savings,
    reserved: tax + savings,
    spendableIncome: totalIncome - tax - savings,
  };
}

export function hasVaults(settings: Settings): boolean {
  return (settings.taxVaultPercent ?? 0) > 0 || (settings.savingsVaultPercent ?? 0) > 0;
}

// ── Per-income split & monthly transfer tracking ────────────

export type IncomeSplit = { tax: number; savings: number; yours: number };

// How ONE income transaction is divided between the vaults and you
export function splitIncome(tx: Transaction, settings: Settings): IncomeSplit {
  if (tx.type !== 'income') return { tax: 0, savings: 0, yours: 0 };
  const tax = isTaxable(tx, settings.taxIncludesSalary ?? false)
    ? Math.round((tx.amount * (settings.taxVaultPercent ?? 0)) / 100)
    : 0;
  const savings = Math.round((tx.amount * (settings.savingsVaultPercent ?? 0)) / 100);
  return { tax, savings, yours: tx.amount - tax - savings };
}

// '2026-10' for October 2026 — the key used for monthly records
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// What you've marked as moved this month for one vault
export function movedThisMonth(settings: Settings, vault: 'tax' | 'savings', date: Date = new Date()): number {
  return settings.vaultMoved?.[monthKey(date)]?.[vault] ?? 0;
}

// One-tap starting points
export const VAULT_PROFILES = [
  {
    id: 'salaried',
    label: 'Salaried',
    icon: 'briefcase-outline',
    tax: 0,
    savings: 20,
    blurb: 'Tax is already deducted (TDS). Save 20%.',
  },
  {
    id: 'freelancer',
    label: 'Freelancer',
    icon: 'laptop-outline',
    tax: 15,
    savings: 20,
    blurb: 'Keep 15% of client income for tax. Save 20%.',
  },
  {
    id: 'founder',
    label: 'Founder',
    icon: 'rocket-outline',
    tax: 20,
    savings: 15,
    blurb: 'Keep 20% of business income for tax. Save 15%.',
  },
] as const;

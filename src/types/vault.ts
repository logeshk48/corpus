export type VaultKind = 'tax' | 'emergency' | 'savings' | 'goal';

export type Vault = {
  id: string;
  name: string;        // "Tax", "Emergency fund", "Goa trip"
  icon: string;        // Ionicons name
  color: string;       // accent colour
  goal?: number;       // optional target amount, in INR
  targetDate?: string; // optional 'YYYY-MM' — the month you want to reach the goal
  kind?: VaultKind;    // unlocks smart info (tax dates, emergency months)
};

export type NewVault = Omit<Vault, 'id'>;

export type VaultEntryType = 'in' | 'out';

// One movement of money into or out of a jar
export type VaultEntry = {
  id: string;
  vaultId: string;
  type: VaultEntryType;
  amount: number; // always positive
  note?: string;
  date: string;   // ISO
};

export type NewVaultEntry = Omit<VaultEntry, 'id'>;

// A jar plus its live numbers
export type VaultWithBalance = Vault & {
  balance: number;
  addedThisMonth: number;
  takenThisMonth: number;
};

// Choices when creating / editing a jar
export const VAULT_COLORS = ['#C9A227', '#4CAF7D', '#7FB7E0', '#A78BDB', '#E08A6B', '#D97BA6'];

export const VAULT_ICONS = [
  'shield-checkmark',
  'medkit',
  'leaf',
  'airplane',
  'home',
  'car',
  'school',
  'gift',
  'phone-portrait',
  'heart',
  'trophy',
  'diamond',
];

// One-tap starter jars shown on the empty screen
export const STARTER_VAULTS: (NewVault & { why: string })[] = [
  {
    name: 'Tax',
    kind: 'tax',
    icon: 'shield-checkmark',
    color: '#C9A227',
    why: 'Keep money aside for advance tax on freelance or business income',
  },
  {
    name: 'Emergency fund',
    kind: 'emergency',
    icon: 'medkit',
    color: '#4CAF7D',
    why: 'A safety net for bad days — aim for 3 to 6 months of expenses',
  },
  {
    name: 'Savings',
    kind: 'savings',
    icon: 'leaf',
    color: '#7FB7E0',
    why: 'Money you are putting away for the future',
  },
];

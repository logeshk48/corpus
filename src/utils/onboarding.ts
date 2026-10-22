import type { NewIncomeStream } from '@/types/incomeStream';
import type { Settings, WorkMode } from '@/types/settings';
import { STARTER_VAULTS, type NewVault, type VaultKind } from '@/types/vault';

// ─── What each way of earning means, shown on the mode cards ───
export const WORK_MODES: {
  id: WorkMode;
  title: string;
  icon: string;
  line: string;     // one-line description
  insight: string;  // what Corpus will do differently for you
}[] = [
  {
    id: 'salaried',
    title: 'Salaried',
    icon: 'briefcase',
    line: 'A fixed salary lands every month',
    insight: 'Your employer already deducts TDS, so Corpus focuses on spending and saving',
  },
  {
    id: 'freelancer',
    title: 'Freelancer',
    icon: 'laptop',
    line: 'Clients pay you per project or hour',
    insight: 'Income is uneven and advance tax is on you, so Corpus suggests a Tax jar',
  },
  {
    id: 'founder',
    title: 'Founder / business',
    icon: 'rocket',
    line: 'You run a business or side hustle',
    insight: 'Corpus tracks what you pay yourself, separate from business money',
  },
];

export type StarterJarKind = Extract<VaultKind, 'emergency' | 'tax' | 'savings'>;

export type OnboardingAnswers = {
  name: string;
  modes: WorkMode[];
  salary: { label: string; amount?: number };   // label = employer name (optional)
  freelance: { label: string; amount?: number }; // label = main client (optional)
  business: { label: string; amount?: number };  // label = business name (optional)
  monthlyBudget?: number;
  jars: StarterJarKind[];
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: '',
  modes: [],
  salary: { label: '' },
  freelance: { label: '' },
  business: { label: '' },
  jars: [],
};

// Steady salary needs a smaller cushion than irregular income
export function emergencyMonths(modes: WorkMode[]): 3 | 6 {
  return modes.some((m) => m !== 'salaried') ? 6 : 3;
}

// Jars ticked by default for this mix of work modes
export function recommendedJars(modes: WorkMode[]): StarterJarKind[] {
  const jars: StarterJarKind[] = ['emergency'];
  if (modes.includes('freelancer') || modes.includes('founder')) jars.push('tax');
  jars.push('savings');
  return jars;
}

// Total expected monthly income from the answers (only selected modes count)
export function expectedIncome(a: OnboardingAnswers): number {
  let total = 0;
  if (a.modes.includes('salaried')) total += a.salary.amount ?? 0;
  if (a.modes.includes('freelancer')) total += a.freelance.amount ?? 0;
  if (a.modes.includes('founder')) total += a.business.amount ?? 0;
  return total;
}

const roundTo500 = (n: number) => Math.round(n / 500) * 500;

// Three budget styles as a share of income
export function budgetOptions(income: number) {
  if (income <= 0) return [];
  return [
    { id: 'saver', label: 'Saver', share: 0.6, amount: roundTo500(income * 0.6) },
    { id: 'balanced', label: 'Balanced', share: 0.7, amount: roundTo500(income * 0.7) },
    { id: 'relaxed', label: 'Relaxed', share: 0.8, amount: roundTo500(income * 0.8) },
  ];
}

// ─── The plan: exactly what will be written to Firestore ───
export type SetupPlan = {
  streams: NewIncomeStream[];
  vaults: NewVault[];
  skipped: string[]; // things that already exist, shown on the review step
  settings: Partial<Settings>;
};

type Existing = {
  streamNames: string[];
  vaultKinds: (VaultKind | undefined)[];
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function buildSetupPlan(
  a: OnboardingAnswers,
  existing: Existing,
  now: Date = new Date()
): SetupPlan {
  const streams: NewIncomeStream[] = [];
  const vaults: NewVault[] = [];
  const skipped: string[] = [];

  const wanted: { mode: WorkMode; name: string; type: NewIncomeStream['type']; amount?: number }[] = [
    { mode: 'salaried', name: a.salary.label.trim() || 'Salary', type: 'salary', amount: a.salary.amount },
    { mode: 'freelancer', name: a.freelance.label.trim() || 'Freelance', type: 'client', amount: a.freelance.amount },
    { mode: 'founder', name: a.business.label.trim() || 'My business', type: 'business', amount: a.business.amount },
  ];
  for (const w of wanted) {
    if (!a.modes.includes(w.mode)) continue;
    if (existing.streamNames.some((n) => same(n, w.name))) {
      skipped.push(`Income stream "${w.name}" already exists`);
      continue;
    }
    streams.push({
      name: w.name,
      type: w.type,
      expectedMonthly: w.amount && w.amount > 0 ? w.amount : undefined,
    });
  }

  for (const kind of a.jars) {
    const starter = STARTER_VAULTS.find((s) => s.kind === kind);
    if (!starter) continue;
    if (existing.vaultKinds.includes(kind)) {
      skipped.push(`${starter.name} jar already exists`);
      continue;
    }
    const { why: _why, ...vault } = starter;
    if (kind === 'emergency' && a.monthlyBudget && a.monthlyBudget > 0) {
      vault.goal = a.monthlyBudget * emergencyMonths(a.modes);
    }
    vaults.push(vault);
  }

  // Only include what was answered — saveSettings treats `undefined` as
  // "delete this field", and skipping a step must never wipe a saved value.
  const settings: Partial<Settings> = { workModes: a.modes, onboardedAt: now.toISOString() };
  if (a.name.trim()) settings.displayName = a.name.trim();
  if (a.monthlyBudget && a.monthlyBudget > 0) settings.monthlyBudget = a.monthlyBudget;

  return { streams, vaults, skipped, settings };
}

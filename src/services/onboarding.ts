import type { SetupPlan } from '@/utils/onboarding';
import { addIncomeStream } from './incomeStreams';
import { saveSettings } from './settings';
import { addVault } from './vaults';

// Writes everything from onboarding. Streams and jars go first; the
// `onboardedAt` flag is saved LAST, so if anything fails midway the person
// lands back in onboarding instead of half set up. Re-running is safe:
// buildSetupPlan already skips streams and jars that exist.
export async function applySetupPlan(plan: SetupPlan) {
  await Promise.all([
    ...plan.streams.map((s) => addIncomeStream(s)),
    ...plan.vaults.map((v) => addVault(v)),
  ]);
  await saveSettings(plan.settings);
}

// "Skip for now": just mark setup as done so it stops appearing
export async function skipOnboarding() {
  await saveSettings({ onboardedAt: new Date().toISOString() });
}

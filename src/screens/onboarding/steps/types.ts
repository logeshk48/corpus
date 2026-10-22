import type { OnboardingAnswers } from '@/utils/onboarding';

export type StepProps = {
  answers: OnboardingAnswers;
  // a patch, or a function of the latest answers (safe for rapid toggles)
  update: (patch: Partial<OnboardingAnswers> | ((a: OnboardingAnswers) => Partial<OnboardingAnswers>)) => void;
};

// '' ↔ undefined, digits ↔ number
export const toDraft = (n?: number) => (n ? String(n) : '');
export const fromDraft = (t: string) => (t === '' ? undefined : Number(t));

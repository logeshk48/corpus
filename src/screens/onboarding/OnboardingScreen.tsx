import { Button, IconButton } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useSettings } from '@/hooks/useSettings';
import { useVaults } from '@/hooks/useVaults';
import { applySetupPlan, skipOnboarding } from '@/services/onboarding';
import {
  budgetOptions,
  buildSetupPlan,
  EMPTY_ANSWERS,
  expectedIncome,
  recommendedJars,
  type OnboardingAnswers,
} from '@/utils/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './OnboardingScreen.styles';
import BudgetStep from './steps/BudgetStep';
import IncomeStep from './steps/IncomeStep';
import JarsStep from './steps/JarsStep';
import ModesStep from './steps/ModesStep';
import ReviewStep from './steps/ReviewStep';
import type { StepProps } from './steps/types';
import WelcomeStep from './steps/WelcomeStep';

// 0 = welcome, 1–5 = the questions (shown in the progress bar)
const STEPS = ['welcome', 'modes', 'income', 'budget', 'jars', 'review'] as const;
const QUESTION_COUNT = STEPS.length - 1;

export default function OnboardingScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { settings, loading: settingsLoading } = useSettings();
  const { streams } = useIncomeStreams();
  const { vaults } = useVaults();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Pre-fill from what's already saved (so "Run setup again" starts from your answers)
  const prefilled = useRef(false);
  useEffect(() => {
    if (settingsLoading || prefilled.current) return;
    prefilled.current = true;
    setAnswers((a) => ({
      ...a,
      name: settings.displayName ?? '',
      modes: settings.workModes ?? [],
      monthlyBudget: settings.monthlyBudget,
    }));
  }, [settingsLoading]);

  const update: StepProps['update'] = (patch) =>
    setAnswers((a) => ({ ...a, ...(typeof patch === 'function' ? patch(a) : patch) }));

  const plan = useMemo(
    () =>
      buildSetupPlan(answers, {
        streamNames: streams.map((s) => s.name),
        vaultKinds: vaults.map((v) => v.kind),
        vaultNames: vaults.map((v) => v.name),
      }),
    [answers, streams, vaults]
  );

  // Sensible defaults the first time a step is reached
  const seeded = useRef({ budget: false, jars: false });
  const goTo = (next: number) => {
    if (next === 3 && !seeded.current.budget) {
      seeded.current.budget = true;
      const balanced = budgetOptions(expectedIncome(answers)).find((o) => o.id === 'balanced');
      if (!answers.monthlyBudget && balanced) update({ monthlyBudget: balanced.amount });
    }
    if (next === 4 && !seeded.current.jars) {
      seeded.current.jars = true;
      update({ jars: recommendedJars(answers.modes) });
    }
    setError(null);
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await applySetupPlan(plan);
      const made = plan.streams.length + plan.vaults.length;
      showToast({ message: made > 0 ? `Corpus is ready · ${made} things set up` : 'Corpus is ready' });
      router.replace('/');
    } catch (e) {
      console.error('Onboarding save failed:', e);
      setError('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  };

  const skip = async () => {
    try {
      await skipOnboarding();
      router.replace('/');
    } catch (e) {
      console.error('Skip onboarding failed:', e);
      setError('Could not save. Check your connection and try again.');
    }
  };

  const name = STEPS[step];
  const canContinue = name !== 'modes' || answers.modes.length > 0;
  const label =
    name === 'welcome'
      ? 'Let’s begin'
      : name === 'review'
        ? 'Enter Corpus'
        : name === 'budget' && !answers.monthlyBudget
          ? 'Skip for now'
          : 'Continue';
  const hint =
    name === 'modes' && answers.modes.length === 0
      ? 'Pick at least one to continue'
      : name === 'welcome'
        ? 'Takes about a minute'
        : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.column} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header: back + progress, or Skip on the welcome screen */}
        <View style={styles.header}>
          {step === 0 ? (
            <Pressable style={styles.skip} onPress={skip} accessibilityRole="button">
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          ) : (
            <>
              <IconButton icon="chevron-back" label="Back" onPress={() => goTo(step - 1)} />
              <View style={styles.progress}>
                {Array.from({ length: QUESTION_COUNT }, (_, i) => (
                  <View key={i} style={[styles.seg, i < step && styles.segOn]} />
                ))}
              </View>
              <Text style={styles.stepCount}>
                {step}/{QUESTION_COUNT}
              </Text>
            </>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View key={step}>
            {name === 'welcome' && <WelcomeStep answers={answers} update={update} />}
            {name === 'modes' && <ModesStep answers={answers} update={update} />}
            {name === 'income' && <IncomeStep answers={answers} update={update} />}
            {name === 'budget' && <BudgetStep answers={answers} update={update} />}
            {name === 'jars' && <JarsStep answers={answers} update={update} />}
            {name === 'review' && <ReviewStep answers={answers} update={update} plan={plan} />}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label={label}
            icon={name === 'review' ? 'checkmark' : 'arrow-forward'}
            iconRight
            onPress={() => (name === 'review' ? finish() : goTo(step + 1))}
            loading={saving}
            disabled={!canContinue}
          />
          {hint && <Text style={styles.footerHint}>{hint}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

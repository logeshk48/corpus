import { Button, IconButton } from '@/components/ui';
import { Spring } from '@/constants/motion';
import Aura from '@/components/fx/Aura';
import { celebrate } from '@/components/fx/Celebrate';
import { Chip } from '@/constants/theme';
import Animated, { FadeIn, FadeInLeft, FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './OnboardingScreen.styles';
import BudgetStep from './steps/BudgetStep';
import IncomeStep from './steps/IncomeStep';
import JarsStep from './steps/JarsStep';
import ModesStep from './steps/ModesStep';
import ReviewStep from './steps/ReviewStep';
import type { StepProps } from './steps/types';
import WelcomeStep from './steps/WelcomeStep';

const STEPS = ['welcome', 'modes', 'income', 'budget', 'jars', 'review'] as const;
// each step has its own light behind it, so moving forward feels like moving somewhere
const TONE = [Chip.teal, Chip.blue, Chip.green, Chip.orange, Chip.yellow, Chip.purple];

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
  const [dir, setDir] = useState(1); // 1 = forward (slides in from the right), -1 = back
  const prog = useSharedValue(1 / STEPS.length);
  useEffect(() => { prog.value = withSpring((step + 1) / STEPS.length, Spring.snappy); }, [step, prog]);
  const fill = useAnimatedStyle(() => ({ width: `${prog.value * 100}%` }));

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
    setDir(next > step ? 1 : -1);
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await applySetupPlan(plan);
      celebrate();
      const made = plan.streams.length + plan.vaults.length;
      showToast({ message: made > 0 ? `Set up ${made} ${made === 1 ? 'thing' : 'things'}. Log your first spend` : 'All set. Log your first spend' });
      router.replace('/add?first=1' as Href);
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
  const label = name === 'review' ? 'Finish setup' : name === 'budget' && !answers.monthlyBudget ? 'Skip for now' : 'Continue';
  const hint = name === 'modes' && answers.modes.length === 0 ? 'Pick at least one' : undefined;
  const skippable = name === 'budget' || name === 'jars';

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View key={`aura${step}`} entering={FadeIn.duration(700)} style={styles.aura} pointerEvents="none"><Aura color={TONE[step]} second={TONE[(step + 1) % TONE.length]} /></Animated.View>
      <KeyboardAvoidingView style={styles.column} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          {step > 0 ? <IconButton icon="chevron-back" label="Back" onPress={() => goTo(step - 1)} /> : <View style={styles.headSide} />}
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }} accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
            <Animated.View style={[styles.fill, fill]} />
          </View>
          {step === 0 ? (
            <Pressable onPress={skip} hitSlop={8} style={styles.headSide} accessibilityRole="button"><Text style={styles.skipText}>Skip</Text></Pressable>
          ) : skippable ? (
            <Pressable hitSlop={8} style={styles.headSide} accessibilityRole="button" onPress={() => {
              // skipping means "not now": nothing is created for this step
              if (name === 'budget') update({ monthlyBudget: undefined });
              if (name === 'jars') { seeded.current.jars = true; update({ jars: [] }); }
              goTo(step + 1);
            }}><Text style={styles.skipText}>Skip</Text></Pressable>
          ) : (
            <Text style={[styles.headSide, styles.count]}>{step + 1} of {STEPS.length}</Text>
          )}
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View key={step} entering={(dir > 0 ? FadeInRight : FadeInLeft).duration(260)}>
            {name === 'welcome' && <WelcomeStep answers={answers} update={update} />}
            {name === 'modes' && <ModesStep answers={answers} update={update} />}
            {name === 'income' && <IncomeStep answers={answers} update={update} />}
            {name === 'budget' && <BudgetStep answers={answers} update={update} />}
            {name === 'jars' && <JarsStep answers={answers} update={update} />}
            {name === 'review' && <ReviewStep answers={answers} update={update} plan={plan} />}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label={label} icon={name === 'review' ? 'checkmark' : 'arrow-forward'} iconRight onPress={() => (name === 'review' ? finish() : goTo(step + 1))} loading={saving} disabled={!canContinue} />
          {hint && <Text style={styles.footerHint}>{hint}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

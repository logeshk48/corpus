import { Field } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useTween } from '@/hooks/useTween';
import { formatINR } from '@/utils/format';
import { budgetOptions, expectedIncome } from '@/utils/onboarding';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import BudgetSlider from '../components/BudgetSlider';
import { styles } from './Step.styles';
import { fromDraft, toDraft, type StepProps } from './types';

const r500 = (n: number) => Math.round(n / 500) * 500;

// The budget turns into the number Corpus shows every morning, so that number is the hero here:
// drag the slider and watch the daily amount and the spend / save split move with it.
export default function BudgetStep({ answers, update }: StepProps) {
  const income = expectedIncome(answers);
  const options = budgetOptions(income);
  const budget = answers.monthlyBudget;
  const saves = income > 0 && budget ? income - budget : undefined;
  const daily = useTween(budget ? Math.round(budget / 30) : 0, 400);
  const share = income > 0 && budget ? Math.min(1, budget / income) : 0;
  const sv = useSharedValue(share);
  useEffect(() => { sv.value = withTiming(share, { duration: 300 }); }, [share, sv]);
  const spendBar = useAnimatedStyle(() => ({ width: `${sv.value * 100}%` }));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">How much do you want to spend a month?</Text>
        <Text style={styles.sub}>Rent, bills and everyday spending together. Corpus turns it into a daily number.</Text>
      </View>

      <View style={styles.daily}>
        <Text style={styles.dailyNum} accessibilityLabel={budget ? `About ${formatINR(Math.round(budget / 30))} a day` : 'No budget yet'}>{formatINR(Math.round(daily))}</Text>
        <Text style={styles.dailyLabel}>a day, before bills and jars</Text>
        {income > 0 && (
          <View style={styles.split}>
            <View style={styles.splitBar}>
              <Animated.View style={[styles.splitSpend, spendBar]} />
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitText}>Spend {budget ? formatINR(budget) : '₹0'}</Text>
              <Text style={[styles.splitText, { color: saves !== undefined && saves < 0 ? Corpus.danger : Corpus.income }]}>
                {saves === undefined ? `Save ${formatINR(income)}` : saves >= 0 ? `Save ${formatINR(saves)}` : `${formatINR(-saves)} over`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {income > 0 && (
        <View style={styles.card}>
          <BudgetSlider
            value={budget ?? options[1].amount}
            min={r500(income * 0.4)}
            max={r500(income)}
            marks={options.map((o) => ({ label: o.label, amount: o.amount }))}
            onChange={(v) => update({ monthlyBudget: v })}
          />
          <Text style={styles.note}>
            {budget === options[0].amount ? 'Saver keeps 40% of what comes in.' : budget === options[1].amount ? 'Balanced keeps 30%. Most people start here.' : budget === options[2].amount ? 'Relaxed keeps 20%, the usual minimum.' : 'Drag the slider or pick one of the three.'}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Field
          label={income > 0 ? 'Or type an exact amount' : 'Monthly budget'}
          money
          value={toDraft(budget)}
          onChangeText={(t) => update({ monthlyBudget: fromDraft(t.replace(/[^0-9]/g, '')) })}
          placeholder="25000"
          hint={income === 0 ? 'No income entered, so there is nothing to suggest. You can skip this and set it later.' : undefined}
        />
      </View>
    </View>
  );
}

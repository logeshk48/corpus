import DailyGauge from '@/components/charts/DailyGauge';
import { Group, GroupRow } from '@/components/ui';
import { Chip } from '@/constants/theme';
import { streamTypeMeta } from '@/types/incomeStream';
import { formatINR } from '@/utils/format';
import { expectedIncome, type SetupPlan } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { styles } from './Step.styles';
import type { StepProps } from './types';

// The payoff: your daily number sweeps in first, then what Corpus will set up arrives row group by row group
export default function ReviewStep({ answers, plan }: StepProps & { plan: SetupPlan }) {
  const name = answers.name.trim().split(' ')[0];
  const budget = plan.settings.monthlyBudget;
  const income = expectedIncome(answers);
  const enter = (i: number) => FadeInDown.delay(500 + i * 140).duration(360);
  return (
    <View style={[styles.wrap, { gap: 20 }]}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{name ? `Your Corpus, ${name}` : 'Your Corpus'}</Text>
        <Text style={styles.sub}>This is what will be set up. Go back to change anything.</Text>
      </View>

      {budget ? (
        <View style={[styles.daily, { paddingTop: 28 }]}>
          <DailyGauge amount={Math.round(budget / 30)} fill={income > 0 ? Math.min(1, budget / income) : 0.7} label="a day to spend" width={260} delay={150} ms={1200} />
          {income > 0 && <Text style={[styles.dailyLabel, { marginTop: 10 }]}>{formatINR(income - budget)} a month left to save</Text>}
        </View>
      ) : null}

      {plan.streams.length > 0 && (
        <Animated.View entering={enter(0)}>
          <Group title="Income">
            {plan.streams.map((s) => (
              <GroupRow key={s.name} icon={streamTypeMeta(s.type).icon} color={Chip.green} title={s.name} subtitle={streamTypeMeta(s.type).label === s.name ? undefined : streamTypeMeta(s.type).label} value={s.expectedMonthly ? `${formatINR(s.expectedMonthly)} a month` : 'Amount later'} />
            ))}
          </Group>
        </Animated.View>
      )}

      <Animated.View entering={enter(1)}>
        <Group title="Budget">
          <GroupRow icon="wallet" color={Chip.orange} title={budget ? 'Spend up to' : 'No budget yet'} value={budget ? `${formatINR(budget)} a month` : 'Set it in Settings'} />
        </Group>
      </Animated.View>

      {plan.vaults.length > 0 && (
        <Animated.View entering={enter(2)}>
          <Group title="Jars">
            {plan.vaults.map((v) => (
              <GroupRow key={v.name} icon={v.icon} color={v.color} title={v.name} value={v.goal ? `Goal ${formatINR(v.goal)}` : 'No goal yet'} />
            ))}
          </Group>
        </Animated.View>
      )}

      <Animated.View entering={enter(3)} style={{ gap: 6 }}>
        {plan.skipped.map((s) => <Text key={s} style={styles.note}>{s}, so it will not be added twice.</Text>)}
        <Text style={styles.note}>Next, add rent, EMIs and subscriptions in Bills, so your daily number keeps money for them.</Text>
      </Animated.View>
    </View>
  );
}

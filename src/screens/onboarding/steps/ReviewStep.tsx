import { Group, GroupRow } from '@/components/ui';
import { Chip } from '@/constants/theme';
import { streamTypeMeta } from '@/types/incomeStream';
import { formatINR } from '@/utils/format';
import type { SetupPlan } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import { styles } from './Step.styles';
import type { StepProps } from './types';

export default function ReviewStep({ answers, plan }: StepProps & { plan: SetupPlan }) {
  const name = answers.name.trim();
  const budget = plan.settings.monthlyBudget;
  return (
    <View style={[styles.wrap, { gap: 20 }]}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{name ? `Ready, ${name}` : 'Ready'}</Text>
        <Text style={styles.sub}>This is what Corpus will set up. Go back to change anything.</Text>
      </View>

      {plan.streams.length > 0 && (
        <Group title="Income">
          {plan.streams.map((s) => (
            <GroupRow key={s.name} icon={streamTypeMeta(s.type).icon} color={Chip.green} title={s.name} subtitle={streamTypeMeta(s.type).label === s.name ? undefined : streamTypeMeta(s.type).label} value={s.expectedMonthly ? `${formatINR(s.expectedMonthly)} a month` : 'Amount later'} />
          ))}
        </Group>
      )}

      <Group title="Budget">
        <GroupRow icon="wallet" color={Chip.orange} title={budget ? 'Spend up to' : 'No budget yet'} value={budget ? `${formatINR(budget)} a month` : 'Set it in Settings'} subtitle={budget ? `About ${formatINR(Math.round(budget / 30))} a day` : undefined} />
      </Group>

      {plan.vaults.length > 0 && (
        <Group title="Jars">
          {plan.vaults.map((v) => (
            <GroupRow key={v.name} icon={v.icon} color={v.color} title={v.name} value={v.goal ? `Goal ${formatINR(v.goal)}` : 'No goal yet'} />
          ))}
        </Group>
      )}

      {plan.skipped.map((s) => <Text key={s} style={styles.note}>{s}, so it will not be added twice.</Text>)}
      <Text style={styles.note}>Next, add rent, EMIs and subscriptions in Bills, so your daily number keeps money for them.</Text>
    </View>
  );
}

import { STARTER_VAULTS } from '@/types/vault';
import { emergencyMonths, recommendedJars, type StarterJarKind } from '@/utils/onboarding';
import { formatINR } from '@/utils/format';
import { Text, View } from 'react-native';
import ChoiceRow from '../components/ChoiceRow';
import { styles } from './Step.styles';
import type { StepProps } from './types';

export default function JarsStep({ answers, update }: StepProps) {
  const recommended = recommendedJars(answers.modes);
  const months = emergencyMonths(answers.modes);

  const extra = (kind: StarterJarKind) => {
    if (kind === 'emergency') {
      const why = months === 6 ? 'irregular income needs a bigger cushion' : 'steady salary, so 3 months is enough';
      return answers.monthlyBudget
        ? `Goal ${formatINR(answers.monthlyBudget * months)}: ${months} months of your budget (${why})`
        : `Aim for ${months} months of expenses (${why})`;
    }
    if (kind === 'tax' && recommended.includes('tax')) {
      return 'Tip: set aside about 10–15% of every client or business payment';
    }
    return undefined;
  };

  const toggle = (kind: StarterJarKind) =>
    update((a) => ({
      jars: a.jars.includes(kind) ? a.jars.filter((j) => j !== kind) : [...a.jars, kind],
    }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>YOUR JARS</Text>
      <Text style={styles.title}>Give your money a job</Text>
      <Text style={styles.sub}>
        Jars are pots you move money into. What’s in a jar is kept out of Safe-to-Spend, so you don’t spend it by accident.
      </Text>

      <View style={styles.list}>
        {STARTER_VAULTS.map((v) => {
          const kind = v.kind as StarterJarKind;
          return (
            <ChoiceRow
              key={kind}
              mode="check"
              icon={v.icon}
              iconColor={v.color}
              title={v.name}
              sub={v.why}
              extra={extra(kind)}
              badge={kind === 'tax' && recommended.includes('tax') ? 'FOR YOU' : undefined}
              selected={answers.jars.includes(kind)}
              onPress={() => toggle(kind)}
            />
          );
        })}
      </View>
      <Text style={styles.muted}>You can add goal jars like “Goa trip” or “New laptop” later from the Jars screen.</Text>
    </View>
  );
}

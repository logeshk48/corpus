import { STARTER_VAULTS } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { emergencyMonths, recommendedJars, type StarterJarKind } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import Pick from '../components/Pick';
import { styles } from './Step.styles';
import type { StepProps } from './types';

export default function JarsStep({ answers, update }: StepProps) {
  const recommended = recommendedJars(answers.modes);
  const months = emergencyMonths(answers.modes);
  const more = (kind: StarterJarKind) => {
    if (kind === 'emergency') {
      const why = months === 6 ? 'Income that changes needs a bigger cushion.' : 'A steady salary needs 3 months.';
      return answers.monthlyBudget ? `Goal ${formatINR(answers.monthlyBudget * months)}, ${months} months of your budget. ${why}` : `Aim for ${months} months of spending. ${why}`;
    }
    if (kind === 'tax' && recommended.includes('tax')) return 'Put 10 to 15% of each client or business payment here.';
    return undefined;
  };
  const toggle = (kind: StarterJarKind) => update((a) => ({ jars: a.jars.includes(kind) ? a.jars.filter((j) => j !== kind) : [...a.jars, kind] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">Pick jars to start with</Text>
        <Text style={styles.sub}>A jar holds money for one job. What is in a jar is left out of your daily number, so you do not spend it by mistake.</Text>
      </View>
      <View style={styles.list}>
        {STARTER_VAULTS.map((v) => {
          const kind = v.kind as StarterJarKind;
          return (
            <Pick key={kind} kind="check" icon={v.icon} color={v.color} title={v.name} line={v.why} more={more(kind)}
              tag={recommended.includes(kind) ? 'Suggested' : undefined} selected={answers.jars.includes(kind)} onPress={() => toggle(kind)} />
          );
        })}
      </View>
      <Text style={styles.note}>Goal jars like a trip or a new laptop can be added later from Jars.</Text>
    </View>
  );
}

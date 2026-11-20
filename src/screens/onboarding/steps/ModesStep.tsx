import { Chip } from '@/constants/theme';
import type { WorkMode } from '@/types/settings';
import { WORK_MODES } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import Pick from '../components/Pick';
import { styles } from './Step.styles';
import type { StepProps } from './types';

const COLOR: Record<WorkMode, string> = { salaried: Chip.blue, freelancer: Chip.purple, founder: Chip.orange };

export default function ModesStep({ answers, update }: StepProps) {
  const toggle = (id: WorkMode) =>
    update((a) => ({ modes: WORK_MODES.map((m) => m.id).filter((m) => (m === id ? !a.modes.includes(id) : a.modes.includes(m))) }));
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">How do you earn?</Text>
        <Text style={styles.sub}>Pick all that apply. Many people have a salary and some freelance work too.</Text>
      </View>
      <View style={styles.list}>
        {WORK_MODES.map((m) => (
          <Pick key={m.id} kind="check" icon={m.icon} color={COLOR[m.id]} title={m.title} line={m.line} more={m.insight} selected={answers.modes.includes(m.id)} onPress={() => toggle(m.id)} />
        ))}
      </View>
      {answers.modes.length > 1 && <Text style={styles.note}>Corpus keeps each income separate and adds them up for you.</Text>}
    </View>
  );
}

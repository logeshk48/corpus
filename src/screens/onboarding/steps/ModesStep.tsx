import { Corpus } from '@/constants/theme';
import type { WorkMode } from '@/types/settings';
import { WORK_MODES } from '@/utils/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import ModeCard from '../components/ModeCard';
import { styles } from './Step.styles';
import type { StepProps } from './types';

export default function ModesStep({ answers, update }: StepProps) {
  const toggle = (id: WorkMode) =>
    update((a) => ({
      // keep the canonical order: salaried, freelancer, founder
      modes: WORK_MODES.map((m) => m.id).filter((m) => (m === id ? !a.modes.includes(id) : a.modes.includes(m))),
    }));

  const names = WORK_MODES.filter((m) => answers.modes.includes(m.id)).map((m) => m.title.split(' ')[0]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>HOW YOU EARN</Text>
      <Text style={styles.title}>Where does your money come from?</Text>
      <Text style={styles.sub}>Pick all that apply. Lots of people are more than one, like a salaried job plus freelance work on weekends.</Text>

      <View style={styles.list}>
        {WORK_MODES.map((m) => (
          <ModeCard
            key={m.id}
            title={m.title}
            line={m.line}
            insight={m.insight}
            icon={m.icon}
            selected={answers.modes.includes(m.id)}
            onPress={() => toggle(m.id)}
          />
        ))}
      </View>

      {names.length > 1 && (
        <View style={styles.note}>
          <Ionicons name="git-merge" size={16} color={Corpus.gold} style={{ marginTop: 1 }} />
          <Text style={styles.noteText}>
            {names.join(' + ')}: Corpus will track each income stream separately and add them up into one picture.
          </Text>
        </View>
      )}
    </View>
  );
}

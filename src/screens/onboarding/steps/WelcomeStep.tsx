import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Field from '../components/Field';
import { styles } from './Step.styles';
import type { StepProps } from './types';

const PROMISES = [
  { icon: 'flash', title: 'One honest number', text: 'What you can safely spend today, after bills and savings' },
  { icon: 'calendar', title: 'Bills that never surprise you', text: 'Rent, EMIs and subscriptions are set aside before they’re due' },
  { icon: 'layers', title: 'Jars for what matters', text: 'Tax, emergencies and goals, each with its own pot' },
  { icon: 'lock-closed', title: 'No bank login, no SMS reading', text: 'You type what you spend. Your bank details never touch Corpus' },
] as const;

export default function WelcomeStep({ answers, update }: StepProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>C</Text>
        </View>
        <Text style={styles.brand}>CORPUS</Text>
        <Text style={styles.tagline}>Earn. Spend. Invest. Grow.</Text>
      </View>

      <Text style={styles.title}>Let’s set Corpus up around how you earn</Text>
      <Text style={styles.sub}>Five quick questions, about a minute. You can change everything later in Settings.</Text>

      <View style={[styles.card, { gap: 18 }]}>
        {PROMISES.map((p) => (
          <View key={p.title} style={styles.promise}>
            <View style={styles.promiseIcon}>
              <Ionicons name={p.icon} size={16} color={Corpus.gold} />
            </View>
            <View style={styles.promiseBody}>
              <Text style={styles.promiseTitle}>{p.title}</Text>
              <Text style={styles.promiseText}>{p.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Field
        label="WHAT SHOULD WE CALL YOU?"
        value={answers.name}
        onChangeText={(name) => update({ name })}
        placeholder="Your first name"
        maxLength={30}
      />
    </View>
  );
}

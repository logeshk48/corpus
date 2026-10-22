import { Corpus } from '@/constants/theme';
import type { WorkMode } from '@/types/settings';
import { expectedIncome, WORK_MODES, type OnboardingAnswers } from '@/utils/onboarding';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Field from '../components/Field';
import { styles } from './Step.styles';
import { fromDraft, toDraft, type StepProps } from './types';

const COPY: Record<WorkMode, { key: 'salary' | 'freelance' | 'business'; nameLabel: string; namePh: string; amountLabel: string; hint: string }> = {
  salaried: {
    key: 'salary',
    nameLabel: 'EMPLOYER (OPTIONAL)',
    namePh: 'e.g. Infosys',
    amountLabel: 'IN-HAND SALARY PER MONTH',
    hint: 'What actually reaches your bank, after PF and TDS',
  },
  freelancer: {
    key: 'freelance',
    nameLabel: 'MAIN CLIENT (OPTIONAL)',
    namePh: 'e.g. Zenith Studio',
    amountLabel: 'A TYPICAL MONTH',
    hint: 'Income uneven? Enter a lean month. It’s safer to plan on less',
  },
  founder: {
    key: 'business',
    nameLabel: 'BUSINESS NAME (OPTIONAL)',
    namePh: 'e.g. Corpus Labs',
    amountLabel: 'WHAT YOU PAY YOURSELF PER MONTH',
    hint: 'Your personal draw, not the business’s revenue',
  },
};

export default function IncomeStep({ answers, update }: StepProps) {
  const total = expectedIncome(answers);
  const modes = WORK_MODES.filter((m) => answers.modes.includes(m.id));

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>YOUR INCOME</Text>
      <Text style={styles.title}>Roughly how much comes in each month?</Text>
      <Text style={styles.sub}>A rough number is fine. Corpus uses it to suggest a budget and to show how much of your income you’re saving.</Text>

      {modes.map((m) => {
        const c = COPY[m.id];
        const value = answers[c.key] as OnboardingAnswers['salary'];
        const set = (patch: Partial<OnboardingAnswers['salary']>) => update({ [c.key]: { ...value, ...patch } });
        return (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIcon}>
                <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={15} color={Corpus.gold} />
              </View>
              <Text style={styles.cardTitle}>{m.title}</Text>
            </View>
            <Field label={c.nameLabel} value={value.label} onChangeText={(label) => set({ label })} placeholder={c.namePh} maxLength={40} />
            <Field
              label={c.amountLabel}
              value={toDraft(value.amount)}
              onChangeText={(t) => set({ amount: fromDraft(t) })}
              placeholder="0"
              hint={c.hint}
              money
            />
          </View>
        );
      })}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{modes.length > 1 ? 'Together, about' : 'About'}</Text>
        <Text style={styles.totalValue}>{total > 0 ? `${formatINR(total)}/mo` : '—'}</Text>
      </View>
    </View>
  );
}

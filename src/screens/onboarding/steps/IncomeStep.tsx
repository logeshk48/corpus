import { Field, IconChip } from '@/components/ui';
import { Chip } from '@/constants/theme';
import type { WorkMode } from '@/types/settings';
import { formatINR } from '@/utils/format';
import { useTween } from '@/hooks/useTween';
import { expectedIncome, WORK_MODES, type OnboardingAnswers } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import { styles } from './Step.styles';
import { fromDraft, toDraft, type StepProps } from './types';

const COPY: Record<WorkMode, { key: 'salary' | 'freelance' | 'business'; color: string; nameLabel: string; namePh: string; amountLabel: string; hint: string }> = {
  salaried: { key: 'salary', color: Chip.blue, nameLabel: 'Employer (optional)', namePh: 'Infosys', amountLabel: 'In-hand salary a month', hint: 'What reaches your bank, after PF and TDS' },
  freelancer: { key: 'freelance', color: Chip.purple, nameLabel: 'Main client (optional)', namePh: 'Zenith Studio', amountLabel: 'A normal month', hint: 'If it changes a lot, use a slow month. Planning on less is safer' },
  founder: { key: 'business', color: Chip.orange, nameLabel: 'Business name (optional)', namePh: 'Your business', amountLabel: 'What you pay yourself a month', hint: 'Your own pay, not the business revenue' },
};

export default function IncomeStep({ answers, update }: StepProps) {
  const total = expectedIncome(answers);
  const shown = useTween(total, 400);
  const modes = WORK_MODES.filter((m) => answers.modes.includes(m.id));
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">About how much comes in each month?</Text>
        <Text style={styles.sub}>A rough number is fine. It is used to suggest a budget.</Text>
      </View>
      {modes.map((m) => {
        const c = COPY[m.id];
        const value = answers[c.key] as OnboardingAnswers['salary'];
        const set = (patch: Partial<OnboardingAnswers['salary']>) => update({ [c.key]: { ...value, ...patch } });
        return (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHead}>
              <IconChip icon={m.icon} color={c.color} size={28} />
              <Text style={styles.cardTitle}>{m.title}</Text>
            </View>
            <Field label={c.amountLabel} money value={toDraft(value.amount)} onChangeText={(t) => set({ amount: fromDraft(t.replace(/[^0-9]/g, '')) })} placeholder="0" hint={c.hint} />
            <Field label={c.nameLabel} value={value.label} onChangeText={(label) => set({ label })} placeholder={c.namePh} maxLength={40} />
          </View>
        );
      })}
      {modes.length > 0 && (
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{modes.length > 1 ? 'Together' : 'In all'}</Text>
          <Text style={styles.totalValue}>{formatINR(Math.round(shown))}{total > 0 ? ' a month' : ''}</Text>
        </View>
      )}
    </View>
  );
}

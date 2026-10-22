import { Corpus } from '@/constants/theme';
import { budgetOptions, expectedIncome } from '@/utils/onboarding';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import ChoiceRow from '../components/ChoiceRow';
import Field from '../components/Field';
import { styles } from './Step.styles';
import { fromDraft, toDraft, type StepProps } from './types';

const BLURB: Record<string, string> = {
  saver: 'Save 40%. Builds wealth fast',
  balanced: 'Save 30%. The sweet spot for most',
  relaxed: 'Save 20%. The 50/30/20 minimum',
};

export default function BudgetStep({ answers, update }: StepProps) {
  const income = expectedIncome(answers);
  const options = budgetOptions(income);
  const budget = answers.monthlyBudget;
  const isPreset = options.some((o) => o.amount === budget);
  const saves = income > 0 && budget ? income - budget : undefined;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>YOUR BUDGET</Text>
      <Text style={styles.title}>How much do you want to spend each month?</Text>
      <Text style={styles.sub}>
        This includes rent, bills and everyday spending. Safe-to-Spend divides it into a daily number on Home.
      </Text>

      {options.length > 0 && (
        <View style={styles.list}>
          {options.map((o) => (
            <ChoiceRow
              key={o.id}
              mode="radio"
              title={o.label}
              sub={BLURB[o.id]}
              badge={o.id === 'balanced' ? 'POPULAR' : undefined}
              amount={formatINR(o.amount)}
              selected={budget === o.amount}
              onPress={() => update({ monthlyBudget: o.amount })}
            />
          ))}
        </View>
      )}

      <Field
        label={options.length > 0 ? 'OR ENTER YOUR OWN' : 'MONTHLY BUDGET'}
        value={isPreset ? '' : toDraft(budget)}
        onChangeText={(t) => update({ monthlyBudget: fromDraft(t) })}
        placeholder={options.length > 0 ? 'Custom amount' : 'e.g. 25000'}
        money
      />

      {saves !== undefined && (
        <View style={styles.note}>
          <Ionicons name={saves >= 0 ? 'trending-up' : 'warning'} size={16} color={saves >= 0 ? Corpus.gold : Corpus.warning} style={{ marginTop: 1 }} />
          <Text style={styles.noteText}>
            {saves >= 0
              ? `That leaves ${formatINR(saves)} a month (${Math.round((saves / income) * 100)}% of your income) to save and invest. That’s ${formatINR(saves * 12)} a year.`
              : `That’s ${formatINR(-saves)} more than you earn. Corpus will still work, but you’d be spending savings every month.`}
          </Text>
        </View>
      )}
      {income === 0 && <Text style={styles.muted}>No income entered, so there are no suggestions. You can also skip this and set it later.</Text>}
    </View>
  );
}

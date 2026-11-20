import { Field } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useTween } from '@/hooks/useTween';
import { formatINR } from '@/utils/format';
import { budgetOptions, expectedIncome } from '@/utils/onboarding';
import { Text, View } from 'react-native';
import Pick from '../components/Pick';
import { styles } from './Step.styles';
import { fromDraft, toDraft, type StepProps } from './types';

const LINE: Record<string, string> = {
  saver: 'Saves 40% of what comes in',
  balanced: 'Saves 30%',
  relaxed: 'Saves 20%, the usual minimum',
};

// The budget turns into the number Corpus shows every morning, so show that number live as you choose
export default function BudgetStep({ answers, update }: StepProps) {
  const income = expectedIncome(answers);
  const options = budgetOptions(income);
  const budget = answers.monthlyBudget;
  const isPreset = options.some((o) => o.amount === budget);
  const saves = income > 0 && budget ? income - budget : undefined;
  const daily = useTween(budget ? Math.round(budget / 30) : 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">How much do you want to spend a month?</Text>
        <Text style={styles.sub}>Rent, bills and everyday spending together. Corpus turns it into a daily number.</Text>
      </View>

      <View style={styles.daily} accessible accessibilityLabel={budget ? `About ${formatINR(Math.round(budget / 30))} a day` : 'No budget yet'}>
        <Text style={styles.dailyNum}>{formatINR(Math.round(daily))}</Text>
        <Text style={styles.dailyLabel}>a day, before bills and jars</Text>
        {saves !== undefined && (
          <Text style={[styles.dailySave, { color: saves >= 0 ? Corpus.income : Corpus.danger }]}>
            {saves >= 0 ? `Leaves ${formatINR(saves)} a month to save` : `${formatINR(-saves)} more than you earn each month`}
          </Text>
        )}
      </View>

      {options.length > 0 && (
        <View style={styles.list}>
          {options.map((o) => (
            <Pick key={o.id} kind="radio" title={o.label} line={LINE[o.id]} tag={o.id === 'balanced' ? 'Suggested' : undefined} right={formatINR(o.amount)} selected={budget === o.amount} onPress={() => update({ monthlyBudget: o.amount })} />
          ))}
        </View>
      )}

      <View style={styles.card}>
      <Field
        label={options.length > 0 ? 'Or type your own' : 'Monthly budget'}
        money
        value={isPreset ? '' : toDraft(budget)}
        onChangeText={(t) => update({ monthlyBudget: fromDraft(t.replace(/[^0-9]/g, '')) })}
        placeholder={options.length > 0 ? 'Your amount' : '25000'}
        hint={income === 0 ? 'No income entered, so there are no suggestions. You can skip this and set it later.' : undefined}
      />
      </View>
    </View>
  );
}

import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from './SafeToSpendSheet.styles';

type Props = {
  visible: boolean;
  result: SafeToSpendResult;
  onClose: () => void;
};

const STATUS_COLOR = { ok: Corpus.gold, tight: Corpus.warning, over: Corpus.danger };

function Row({ label, value, sign }: { label: string; value: number; sign?: '+' | '−' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>
        {sign ?? ''}
        {formatINR(Math.abs(value))}
      </Text>
    </View>
  );
}

export default function SafeToSpendSheet({ visible, result, onClose }: Props) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { maxHeight: '90%' }]}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={sheet.iconCircle}>
              <Ionicons name="calculator-outline" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>How today's number works</Text>
              <Text style={sheet.subtitle}>Your money for the month, shared fairly across the days left</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }}>
            {result.status === 'noData' ? (
              <View style={styles.steps}>
                <Text style={styles.step}>1. Corpus takes this month's income (or your monthly budget).</Text>
                <Text style={styles.step}>2. It subtracts what you've spent and what you've put into jars.</Text>
                <Text style={styles.step}>3. It keeps aside what your jar goals still need this month.</Text>
                <Text style={styles.step}>4. The rest is shared equally across the days left in the month.</Text>
                <Text style={styles.note}>
                  Add your income on the Add tab (choose Income), or set a monthly budget in Settings,
                  to see your number.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.table}>
                  {result.limitedByBudget ? (
                    <>
                      <Row label="Your monthly budget" value={result.monthlyBudget ?? 0} />
                      <Row label="Spent this month" value={result.spent} sign="−" />
                      {result.billsDue > 0 && (
                        <Row label="Bills still due this month" value={result.billsDue} sign="−" />
                      )}
                    </>
                  ) : (
                    <>
                      <Row label="Income this month" value={result.income} sign="+" />
                      <Row label="Spent this month" value={result.spent} sign="−" />
                      {result.movedToJars !== 0 && (
                        <Row
                          label={result.movedToJars > 0 ? 'Moved into jars' : 'Taken out of jars'}
                          value={result.movedToJars}
                          sign={result.movedToJars > 0 ? '−' : '+'}
                        />
                      )}
                      {result.plansDue > 0 && (
                        <Row label="Kept for jar goals this month" value={result.plansDue} sign="−" />
                      )}
                      {result.billsDue > 0 && (
                        <Row label="Bills still due this month" value={result.billsDue} sign="−" />
                      )}
                    </>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.totalLabel}>Left for the rest of the month</Text>
                    <Text style={[styles.totalValue, { color: result.available < 0 ? Corpus.danger : Corpus.text }]}>
                      {result.available < 0 ? '−' : ''}
                      {formatINR(Math.abs(result.available))}
                    </Text>
                  </View>
                </View>

                <View style={styles.table}>
                  <Row label={`Today's allowance (÷ ${result.daysLeft} days left)`} value={result.dailyAllowance} />
                  <Row label="Spent today" value={result.spentToday} sign="−" />
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.totalLabel}>
                      {result.safeToday < 0 ? 'Over today by' : 'Safe to spend today'}
                    </Text>
                    <Text style={[styles.totalValue, { color: STATUS_COLOR[result.status] }]}>
                      {formatINR(Math.abs(result.safeToday))}
                    </Text>
                  </View>
                </View>

                {result.daysLeft > 1 && (
                  <View style={styles.tomorrow}>
                    <Ionicons name="sunny-outline" size={18} color={Corpus.gold} />
                    <Text style={styles.tomorrowText}>
                      If you spend nothing more today, from tomorrow you'll have{' '}
                      <Text style={{ fontWeight: '600', color: Corpus.gold }}>
                        {formatINR(result.tomorrowAllowance)}/day
                      </Text>
                      . Spending less today makes every next day a little richer.
                    </Text>
                  </View>
                )}

                <Text style={styles.note}>
                  {result.limitedByBudget
                    ? 'Your monthly budget is stricter than your income, so Corpus uses the budget. '
                    : result.monthlyBudget
                    ? 'Your income is stricter than your monthly budget, so Corpus uses your income. '
                    : ''}
                  Money in jars and bills still due are protected — never counted as spendable. Category budgets don't
                  change this number; they warn you on the Budgets screen.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

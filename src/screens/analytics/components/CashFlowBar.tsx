import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import type { CashFlow } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { StyleSheet, Text, View } from 'react-native';

// One stacked bar: where this month's income went. Direct labels below carry every value.
export default function CashFlowBar({ flow }: { flow: CashFlow }) {
  const overspent = flow.left < 0;
  const parts = [
    { key: 'bills', label: 'Fixed bills', amount: flow.bills, color: ChartColors.flow.bills },
    { key: 'other', label: 'Other spending', amount: flow.other, color: ChartColors.flow.other },
    { key: 'jars', label: 'Into jars', amount: Math.max(flow.jars, 0), color: ChartColors.flow.jars },
    { key: 'left', label: 'Left over', amount: Math.max(flow.left, 0), color: ChartColors.flow.left },
  ].filter((p) => p.amount > 0);
  const whole = Math.max(parts.reduce((s, p) => s + p.amount, 0), 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.bar} accessibilityLabel="Cash flow bar">
        {parts.map((p) => (
          <View key={p.key} style={{ flex: p.amount / whole, backgroundColor: p.color, height: '100%' }} />
        ))}
      </View>
      <View style={styles.rows}>
        {parts.map((p) => (
          <View key={p.key} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <Text style={styles.label}>{p.label}</Text>
            <Text style={styles.value}>{formatINR(Math.round(p.amount))}</Text>
            <Text style={styles.pct}>{flow.income > 0 ? `${Math.round((p.amount / flow.income) * 100)}%` : ''}</Text>
          </View>
        ))}
        {flow.jars < 0 && (
          <Text style={styles.note}>You took {formatINR(-flow.jars)} out of jars this month.</Text>
        )}
        {overspent && (
          <Text style={[styles.note, { color: Corpus.danger }]}>
            Spending was {formatINR(-flow.left)} more than income this month.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, backgroundColor: ChartColors.track },
  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  label: { flex: 1, fontSize: Type.body, color: Corpus.text },
  value: { fontSize: Type.body, fontWeight: '600', color: Corpus.text },
  pct: { width: 38, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted },
  note: { fontSize: Type.small, color: Corpus.textMuted },
});

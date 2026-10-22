import { ChartColors } from '@/constants/chartColors';
import { Corpus } from '@/constants/theme';
import { monthLabel, type MonthPoint } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const HEIGHT = 130;
const compact = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${n}`;

type Props = { data: MonthPoint[]; selectedKey: string; onSelectMonth: (key: string) => void };

// Grouped columns: income (green) vs spending (amber), legend + tap readout + table view
export default function TrendChart({ data, selectedKey, onSelectMonth }: Props) {
  const [table, setTable] = useState(false);
  const max = Math.max(...data.flatMap((d) => [d.income, d.spent]), 1);
  const sel = data.find((d) => d.key === selectedKey);

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: ChartColors.income }]} />
          <Text style={styles.legendText}>Income</Text>
          <View style={[styles.swatch, { backgroundColor: ChartColors.spend, marginLeft: 12 }]} />
          <Text style={styles.legendText}>Spending</Text>
        </View>
        <Pressable onPress={() => setTable(!table)} hitSlop={8}>
          <Text style={styles.toggle}>{table ? 'Show chart' : 'Show table'}</Text>
        </Pressable>
      </View>

      {table ? (
        <View>
          <View style={styles.tRow}>
            <Text style={[styles.tCell, styles.tHead, { textAlign: 'left' }]}>Month</Text>
            <Text style={[styles.tCell, styles.tHead]}>Income</Text>
            <Text style={[styles.tCell, styles.tHead]}>Spending</Text>
            <Text style={[styles.tCell, styles.tHead]}>Saved</Text>
          </View>
          {data.map((d) => (
            <View key={d.key} style={[styles.tRow, styles.tLine]}>
              <Text style={[styles.tCell, { textAlign: 'left' }]}>{monthLabel(d.key, 'short')}</Text>
              <Text style={styles.tCell}>{formatINR(d.income)}</Text>
              <Text style={styles.tCell}>{formatINR(d.spent)}</Text>
              <Text style={styles.tCell}>{formatINR(d.income - d.spent)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          {sel && (
            <Text style={styles.readout}>
              {monthLabel(sel.key)} · income {formatINR(sel.income)} · spent {formatINR(sel.spent)}
            </Text>
          )}
          <View style={styles.plot}>
            {data.map((d) => {
              const active = d.key === selectedKey;
              return (
                <Pressable
                  key={d.key}
                  style={styles.group}
                  onPress={() => onSelectMonth(d.key)}
                  accessibilityLabel={`${monthLabel(d.key)}: income ${formatINR(d.income)}, spending ${formatINR(d.spent)}`}
                >
                  <View style={[styles.pair, { opacity: active ? 1 : 0.45 }]}>
                    <View style={styles.colWrap}>
                      {active && d.income > 0 && <Text style={styles.valueLabel}>{compact(d.income)}</Text>}
                      <View style={[styles.col, { height: d.income > 0 ? Math.max((d.income / max) * HEIGHT, 3) : 0, backgroundColor: ChartColors.income }]} />
                    </View>
                    <View style={styles.colWrap}>
                      {active && d.spent > 0 && <Text style={styles.valueLabel}>{compact(d.spent)}</Text>}
                      <View style={[styles.col, { height: d.spent > 0 ? Math.max((d.spent / max) * HEIGHT, 3) : 0, backgroundColor: ChartColors.spend }]} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.xRow}>
            {data.map((d) => (
              <Text key={d.key} style={[styles.xLabel, d.key === selectedKey && { color: Corpus.text, fontWeight: '600' }]}>
                {monthLabel(d.key, 'short')}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, color: Corpus.textMuted },
  toggle: { fontSize: 12, fontWeight: '500', color: Corpus.gold },
  readout: { fontSize: 12, color: Corpus.text },
  plot: {
    height: HEIGHT + 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: ChartColors.grid,
  },
  group: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  pair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  colWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  col: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  valueLabel: { fontSize: 9, color: Corpus.textMuted, marginBottom: 2 },
  xRow: { flexDirection: 'row' },
  xLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: Corpus.textMuted },
  tRow: { flexDirection: 'row', paddingVertical: 6 },
  tLine: { borderTopWidth: 0.5, borderTopColor: Corpus.border },
  tCell: { flex: 1, fontSize: 12, color: Corpus.text, textAlign: 'right' },
  tHead: { fontSize: 11, color: Corpus.textMuted },
});

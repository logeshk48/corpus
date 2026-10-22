import { ChartColors } from '@/constants/chartColors';
import { Corpus } from '@/constants/theme';
import type { CategoryShare } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

// Sorted horizontal bars, one hue (magnitude, not identity). Labels carry the numbers.
export default function CategoryBars({ data }: { data: CategoryShare[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <View style={styles.list} accessibilityRole="list">
      {data.map((d) => (
        <View key={d.id} style={styles.row} accessible accessibilityLabel={`${d.label}: ${formatINR(d.amount)}, ${d.share} percent`}>
          <View style={styles.top}>
            <Ionicons name={d.icon as any} size={14} color={Corpus.textMuted} />
            <Text style={styles.label}>{d.label}</Text>
            <Text style={styles.count}>{d.count}×</Text>
            <Text style={styles.amount}>{formatINR(d.amount)}</Text>
            <Text style={styles.share}>{d.share}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(d.amount / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  row: { gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, fontSize: 13, color: Corpus.text },
  count: { fontSize: 11, color: Corpus.textFaint },
  amount: { fontSize: 13, fontWeight: '600', color: Corpus.text },
  share: { width: 38, textAlign: 'right', fontSize: 12, color: Corpus.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: ChartColors.track, overflow: 'hidden' },
  fill: { height: 8, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: ChartColors.spend },
});

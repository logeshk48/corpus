import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import type { SourceShare } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { StyleSheet, Text, View } from 'react-native';

// Where income came from — one hue (green), sorted, unlinked income last.
export default function IncomeSources({ data }: { data: SourceShare[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <View style={styles.list}>
      {data.map((d) => (
        <View key={d.id} style={styles.row}>
          <View style={styles.top}>
            <Text style={[styles.label, d.id === '_other' && { color: Corpus.textMuted }]}>{d.name}</Text>
            <Text style={styles.amount}>{formatINR(d.amount)}</Text>
            <Text style={styles.share}>{d.share}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(d.amount / max) * 100}%`, opacity: d.id === '_other' ? 0.5 : 1 }]} />
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
  label: { flex: 1, fontSize: Type.body, color: Corpus.text },
  amount: { fontSize: Type.body, fontWeight: '600', color: Corpus.text },
  share: { width: 38, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: ChartColors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: ChartColors.income },
});

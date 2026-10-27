import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import type { CategoryShare } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  data: CategoryShare[];
  previous?: Map<string, number>;         // same categories, comparable period last month
  budgets?: Record<string, number>;       // category id → monthly limit
  previousLabel?: string;                 // e.g. "Sept 1–22"
  onPress?: (id: string) => void;
};

// Sorted horizontal bars, one hue. ▲▼ vs last month; a white tick marks the budget limit.
export default function CategoryBars({ data, previous, budgets, previousLabel = 'last month', onPress }: Props) {
  const max = Math.max(...data.map((d) => Math.max(d.amount, budgets?.[d.id] ?? 0)), 1);
  // What's gone over budget matters more than what's biggest, so it goes first
  const over = (d: (typeof data)[number]) => {
    const limit = budgets?.[d.id];
    return limit && d.amount > limit ? d.amount - limit : 0;
  };
  const rows = [...data].sort((a, b) => over(b) - over(a) || b.amount - a.amount);
  return (
    <View style={styles.list}>
      {rows.map((d) => {
        const before = previous?.get(d.id) ?? 0;
        const pct = before > 0 ? Math.round(((d.amount - before) / before) * 100) : null;
        const limit = budgets?.[d.id];
        const over = limit !== undefined && d.amount > limit;
        return (
          <Pressable
            key={d.id}
            onPress={() => onPress?.(d.id)}
            disabled={!onPress}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            accessibilityLabel={`${d.label}: ${formatINR(d.amount)}, ${d.share} percent. Opens details.`}
          >
            <View style={styles.top}>
              <Ionicons name={d.icon as any} size={14} color={Corpus.textMuted} />
              <Text style={styles.label}>{d.label}</Text>
              <Text style={styles.amount}>{formatINR(d.amount)}</Text>
              <Text style={styles.share}>{d.share}%</Text>
              <Ionicons name="chevron-forward" size={13} color={Corpus.textFaint} />
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(d.amount / max) * 100}%` }]} />
              {limit !== undefined && (
                <View style={[styles.marker, { left: `${Math.min((limit / max) * 100, 100)}%` }]} />
              )}
            </View>
            <Text style={styles.meta}>
              {!previous
                ? ''
                : pct === null
                ? before === 0 && d.amount > 0
                  ? `New vs ${previousLabel}`
                  : ''
                : pct === 0
                ? `Same as ${previousLabel}`
                : `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ${previousLabel}`}
              {limit !== undefined
                ? `${pct !== null || before === 0 ? ' · ' : ''}${over ? `over budget by ${formatINR(d.amount - limit)}` : `budget ${formatINR(limit)}`}`
                : ''}
            </Text>
          </Pressable>
        );
      })}
      {budgets && Object.keys(budgets).length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendTick} />
          <Text style={styles.legendText}>Budget limit</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  row: { gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, fontSize: Type.body, color: Corpus.text },
  amount: { fontSize: Type.body, fontWeight: '600', color: Corpus.text },
  share: { width: 34, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: ChartColors.track },
  fill: { height: 8, borderRadius: 4, backgroundColor: ChartColors.spend },
  marker: { position: 'absolute', top: -3, width: 2, height: 14, marginLeft: -1, borderRadius: 1, backgroundColor: ChartColors.budgetMarker },
  meta: { fontSize: Type.caption, color: Corpus.textMuted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTick: { width: 2, height: 12, borderRadius: 1, backgroundColor: ChartColors.budgetMarker },
  legendText: { fontSize: Type.caption, color: Corpus.textMuted },
});

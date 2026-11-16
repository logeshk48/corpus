import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type MonthBar = { key: string; label: string; full: string; value: number };

// Month-by-month columns (ui-ux-pro-max: bar chart for discrete periods, direct labels).
// Tap a column to read it; the reading sits above in words. A dashed line marks the monthly target if given.
export default function MonthBars({ bars, color, target, targetLabel = 'Expected', height = 96, appear = 1 }: {
  bars: MonthBar[]; color: string; target?: number; targetLabel?: string; height?: number; appear?: number;
}) {
  const [sel, setSel] = useState(bars.length - 1);
  const i = Math.min(sel, bars.length - 1);
  const max = Math.max(target ?? 0, ...bars.map((b) => b.value), 1);
  const cur = bars[i];
  return (
    <View style={{ gap: 8 }}>
      <View style={s.read}>
        <Text style={s.readLabel}>{cur.full}</Text>
        <Text style={s.readValue}>{cur.value > 0 ? formatINR(Math.round(cur.value)) : 'Nothing'}</Text>
      </View>
      <View style={{ height }}>
        {target !== undefined && target > 0 && (
          <View style={[s.target, { bottom: (target / max) * height }]} pointerEvents="none" />
        )}
        <View style={s.cols}>
          {bars.map((b, k) => {
            const on = k === i;
            return (
              <Pressable key={b.key} style={s.col} onPress={() => setSel(k)} accessibilityRole="button" accessibilityState={{ selected: on }}
                accessibilityLabel={`${b.full}: ${b.value > 0 ? formatINR(Math.round(b.value)) : 'nothing'}`}>
                <View style={{ height: Math.max(3, (b.value / max) * height * appear), width: '100%', maxWidth: 26, borderRadius: 6, backgroundColor: b.value > 0 ? color : Corpus.cardAlt, opacity: on ? 1 : 0.4 }} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={s.labels}>
        {bars.map((b, k) => (
          <Text key={b.key} style={[s.label, k === i && s.labelOn]} numberOfLines={1}>{b.label}</Text>
        ))}
      </View>
      {target !== undefined && target > 0 && (
        <View style={s.legend}>
          <View style={s.dash} />
          <Text style={s.legendText}>{targetLabel} {formatINR(target)} a month</Text>
        </View>
      )}
    </View>
  );
}

// The last `n` months as empty bars, oldest first, to fill from transactions
export function lastMonths(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - k), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      label: d.toLocaleDateString('en-IN', { month: 'short' }).slice(0, n > 6 ? 1 : 3),
      full: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });
}

const s = StyleSheet.create({
  read: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  readLabel: { fontSize: Type.body, color: Corpus.textMuted },
  readValue: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text, ...tabular },
  cols: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textMuted },
  labels: { flexDirection: 'row', gap: 6 },
  label: { flex: 1, textAlign: 'center', fontSize: Type.small, color: Corpus.textMuted },
  labelOn: { color: Corpus.text, fontFamily: Font.display },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dash: { width: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textMuted },
  legendText: { fontSize: Type.small, color: Corpus.textMuted },
});

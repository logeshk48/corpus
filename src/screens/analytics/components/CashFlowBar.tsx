import { ChartColors } from '@/constants/chartColors';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { CashFlow } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// One stacked bar: where this month's income went. It fills from the left when it shows.
// Tap a part (or its row) to pick it out and read what it means.
export default function CashFlowBar({ flow }: { flow: CashFlow }) {
  const [sel, setSel] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const g = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { g.value = 1; return; }
    g.value = 0;
    g.value = withDelay(100, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [flow.income, reduce, g]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: g.value }] }));

  const overspent = flow.left < 0;
  const parts = [
    { key: 'bills', label: 'Fixed bills', amount: flow.bills, color: ChartColors.flow.bills, means: 'Your repeating bills, like rent, EMIs and subscriptions. Hard to change month to month.' },
    { key: 'other', label: 'Other spending', amount: flow.other, color: ChartColors.flow.other, means: 'Everything else you logged. This is where a budget makes the biggest difference.' },
    { key: 'jars', label: 'Into jars', amount: Math.max(flow.jars, 0), color: ChartColors.flow.jars, means: 'Set aside for your goals this month.' },
    { key: 'left', label: 'Left over', amount: Math.max(flow.left, 0), color: ChartColors.flow.left, means: 'Not spent and not in a jar yet. Worth moving to a jar or an SIP.' },
  ].filter((p) => p.amount > 0);
  const whole = Math.max(parts.reduce((a, p) => a + p.amount, 0), 1);
  const picked = parts.find((p) => p.key === sel);

  return (
    <View style={s.wrap}>
      <Animated.View style={[s.bar, { transformOrigin: 'left' }, grow]} accessibilityLabel="Where your income went">
        {parts.map((p) => (
          <Pressable key={p.key} onPress={() => setSel(sel === p.key ? null : p.key)} style={{ flex: p.amount / whole, height: '100%' }}>
            <View style={{ flex: 1, backgroundColor: p.color, opacity: sel == null || sel === p.key ? 1 : 0.25 }} />
          </Pressable>
        ))}
      </Animated.View>
      <View style={s.rows}>
        {parts.map((p) => {
          const on = sel === p.key;
          return (
            <Pressable key={p.key} onPress={() => setSel(on ? null : p.key)} style={[s.row, sel != null && !on && { opacity: 0.45 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View style={[s.swatch, { backgroundColor: p.color }]} />
              <Text style={[s.label, on && { fontFamily: Font.display }]}>{p.label}</Text>
              <Text style={s.value}>{formatINR(Math.round(p.amount))}</Text>
              <Text style={s.pct}>{flow.income > 0 ? `${Math.round((p.amount / flow.income) * 100)}%` : ''}</Text>
            </Pressable>
          );
        })}
        {picked && <Text style={s.note}>{picked.means}</Text>}
        {flow.jars < 0 && <Text style={s.note}>You took {formatINR(-flow.jars)} out of jars this month.</Text>}
        {overspent && <Text style={[s.note, { color: Corpus.danger }]}>Spending was {formatINR(-flow.left)} more than income this month.</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  bar: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', gap: 2, backgroundColor: Corpus.cardAlt },
  rows: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  label: { flex: 1, fontSize: Type.body, color: Corpus.text },
  value: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  pct: { width: 38, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});

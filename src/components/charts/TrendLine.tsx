import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export type TrendPoint = { key: string; label: string; full: string; value: number };

// A line through your months, drawn with plain Views (no SVG). The latest point pulses.
// Tap anywhere along it to read that month; the reading is written above in words.
export default function TrendLine({ points, color, height = 96, appear = 1, onSelect }: {
  points: TrendPoint[]; color: string; height?: number; appear?: number; onSelect?: (i: number | null) => void;
}) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => { if (!reduce) pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false); }, [reduce, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 2.2 }] }));

  const n = points.length;
  const vals = points.map((p) => p.value);
  const hi = Math.max(...vals), lo = Math.min(...vals);
  const pad = Math.max((hi - lo) * 0.18, Math.abs(hi) * 0.02, 1);
  const max = hi + pad, min = lo - pad;
  const x = (i: number) => (n === 1 ? w / 2 : 8 + (i / (n - 1)) * (w - 16));
  const y = (v: number) => ((max - v) / (max - min)) * height;
  const shown = Math.max(1, Math.round(1 + (n - 1) * appear)); // the line draws itself left to right
  const i = sel ?? n - 1;
  const pick = (k: number | null) => { setSel(k); onSelect?.(k); };

  return (
    <View style={{ gap: 6 }}>
      <View style={s.read}>
        <Text style={s.readLabel}>{points[i].full}</Text>
        <Text style={[s.readValue, points[i].value < 0 && { color: Corpus.danger }]}>{formatINR(Math.round(points[i].value))}</Text>
      </View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {min < 0 && max > 0 && <View style={[s.zero, { top: y(0) }]} />}
        {w > 0 && points.slice(0, shown - 1).map((p, k) => {
          const x1 = x(k), y1 = y(p.value), x2 = x(k + 1), y2 = y(points[k + 1].value);
          const len = Math.hypot(x2 - x1, y2 - y1);
          const ang = Math.atan2(y2 - y1, x2 - x1);
          return (
            <View key={p.key}>
              {/* soft fill under the segment */}
              <View style={{ position: 'absolute', left: x1, width: x2 - x1, top: Math.min(y1, y2) + Math.abs(y2 - y1) / 2, bottom: -height + height, height: height - (Math.min(y1, y2) + Math.abs(y2 - y1) / 2), backgroundColor: color, opacity: 0.1 }} />
              <View style={{ position: 'absolute', left: x1, top: y1 - 1.5, width: len, height: 3, borderRadius: 2, backgroundColor: color, transformOrigin: 'left center', transform: [{ rotate: `${ang}rad` }] }} />
            </View>
          );
        })}
        {w > 0 && points.slice(0, shown).map((p, k) => {
          const last = k === n - 1;
          const on = k === i;
          return (
            <View key={p.key} style={{ position: 'absolute', left: x(k) - 6, top: y(p.value) - 6, width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
              {last && !reduce && <Animated.View style={[{ position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: color }, ring]} />}
              <View style={{ width: on ? 12 : 7, height: on ? 12 : 7, borderRadius: 6, backgroundColor: on ? color : Corpus.card, borderWidth: on ? 2 : 2, borderColor: on ? Corpus.card : color }} />
            </View>
          );
        })}
        {/* tap zones, one per month */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {points.map((p, k) => (
            <Pressable key={p.key} style={{ flex: 1 }} onPress={() => pick(k === n - 1 ? null : k)} accessibilityRole="button" accessibilityLabel={`${p.full}: ${formatINR(Math.round(p.value))}`} />
          ))}
        </View>
      </View>
      <View style={s.labels}>
        <Text style={s.label}>{points[0].full}</Text>
        <Text style={s.label}>Now</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  read: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  readLabel: { fontSize: Type.body, color: Corpus.textMuted },
  readValue: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text, ...tabular },
  zero: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: Corpus.border },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: Type.small, color: Corpus.textMuted },
});

import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const APath = Animated.createAnimatedComponent(Path);
export type TrendMonth = { key: string; label: string; a: number; b: number }; // a = income, b = spending

// A smooth line that never overshoots its points (monotone cubic, Fritsch–Carlson): between two months it
// only rises or falls, so a month with nothing logged never shows a bump.
function smooth(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return '';
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) m.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1));
  const t: number[] = pts.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (pts[i + 1][0] - pts[i][0]) / 3;
    d += ` C ${pts[i][0] + dx} ${pts[i][1] + t[i] * dx}, ${pts[i + 1][0] - dx} ${pts[i + 1][1] - t[i + 1] * dx}, ${pts[i + 1][0]} ${pts[i + 1][1]}`;
  }
  return d;
}
const plen = (pts: [number, number][]) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0) * 1.15;

// Income and spending, month by month: two smooth lines with soft gradient fills that draw themselves in.
// Tap a month under the chart to pick it. Green = came in, orange = spent, named in the legend above it.
export default function AreaTrend({ data, selected, onSelect, height = 150 }: { data: TrendMonth[]; selected: string; onSelect: (key: string) => void; height?: number }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [w, setW] = useState(0);
  const p = useSharedValue(reduce ? 1 : 0);
  const key = data.map((d) => `${d.a}-${d.b}`).join();
  useEffect(() => { if (reduce) { p.value = 1; return; } p.value = 0; p.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }); }, [key, reduce, p]);
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b])) * 1.12;
  const padX = 14, top = 10, bottom = 8;
  const x = (i: number) => padX + (i * (w - padX * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => top + (1 - v / max) * (height - top - bottom);
  const A = data.map((d, i) => [x(i), y(d.a)] as [number, number]);
  const B = data.map((d, i) => [x(i), y(d.b)] as [number, number]);
  const area = (pts: [number, number][]) => `${smooth(pts)} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  const la = plen(A), lb = plen(B);
  const lineA = useAnimatedProps(() => ({ strokeDashoffset: la * (1 - p.value) }));
  const lineB = useAnimatedProps(() => ({ strokeDashoffset: lb * (1 - p.value) }));
  const fill = useAnimatedProps(() => ({ opacity: p.value }));
  const si = data.findIndex((d) => d.key === selected);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && data.length > 1 && (
          <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg width={w} height={height}>
              <Defs>
                <LinearGradient id={`ga${id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Corpus.income} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={Corpus.income} stopOpacity={0} />
                </LinearGradient>
                <LinearGradient id={`gb${id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Chip.orange} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={Chip.orange} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {si >= 0 && <Line x1={x(si)} x2={x(si)} y1={0} y2={height} stroke={Corpus.border} strokeWidth={1.5} strokeDasharray="4 4" />}
              <APath d={area(A)} fill={`url(#ga${id})`} animatedProps={fill} />
              <APath d={area(B)} fill={`url(#gb${id})`} animatedProps={fill} />
              <APath d={smooth(A)} stroke={Corpus.income} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={`${la} ${la}`} animatedProps={lineA} />
              <APath d={smooth(B)} stroke={Chip.orange} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={`${lb} ${lb}`} animatedProps={lineB} />
              {si >= 0 && (
                <>
                  <Circle cx={A[si][0]} cy={A[si][1]} r={5.5} fill={Corpus.income} stroke={Corpus.card} strokeWidth={2.5} />
                  <Circle cx={B[si][0]} cy={B[si][1]} r={5.5} fill={Chip.orange} stroke={Corpus.card} strokeWidth={2.5} />
                </>
              )}
            </Svg>
          </View>
        )}
      </View>
      <View style={s.months}>
        {data.map((d) => {
          const on = d.key === selected;
          return (
            <Pressable key={d.key} onPress={() => onSelect(d.key)} style={({ pressed }) => [s.month, on && s.monthOn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.label}: ₹${Math.round(d.a).toLocaleString('en-IN')} in, ₹${Math.round(d.b).toLocaleString('en-IN')} spent`}>
              <Text style={[s.monthText, on && { color: Corpus.onGold }]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  months: { flexDirection: 'row', justifyContent: 'space-between' },
  month: { minWidth: 40, minHeight: 32, paddingHorizontal: 6, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  monthOn: { backgroundColor: Corpus.gold },
  monthText: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted, ...tabular },
});

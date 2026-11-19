import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Point } from '@/utils/market';
import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const APath = Animated.createAnimatedComponent(Path);
const MAX = 160; // points drawn; longer series are thinned (the last point always kept)

// A broker-style price chart: one line with a soft gradient under it, green if up over the range (against the
// previous close on 1D), red if down, a dashed line at the starting price. Drag a finger across it to read
// the price at any moment; `onScrub` hands that point to the header so the big number follows your finger.
export default function StockChart({ points, base, height = 200, onScrub }: { points: Point[]; base?: number | null; height?: number; onScrub?: (p: Point | null) => void }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [w, setW] = useState(0);
  const [at, setAt] = useState<number | null>(null);
  const pts = points.length <= MAX ? points : Array.from({ length: MAX }, (_, i) => points[Math.floor((i * (points.length - 1)) / (MAX - 1))]);
  const n = pts.length;
  const vals = pts.map((p) => p.c);
  const ref = base ?? (n ? vals[0] : 0);
  const lo = n ? Math.min(...vals, ref) : 0, hi = n ? Math.max(...vals, ref) : 1;
  const span = hi - lo || 1;
  const up = n ? vals[n - 1] >= ref : true;
  const color = up ? Corpus.income : Corpus.danger;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * w : 0);
  const y = (v: number) => 8 + (1 - (v - lo) / span) * (height - 16);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.c).toFixed(1)}`).join(' ');
  const len = w * 2.2;

  const draw = useSharedValue(reduce ? 1 : 0);
  const key = `${n}-${pts[0]?.t}-${pts[n - 1]?.c}`;
  useEffect(() => { if (reduce) { draw.value = 1; return; } draw.value = 0; draw.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [key, reduce, draw]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));
  const fillProps = useAnimatedProps(() => ({ opacity: draw.value }));

  const pick = (px: number) => {
    if (n < 2 || w <= 0) return;
    const i = Math.max(0, Math.min(n - 1, Math.round((px / w) * (n - 1))));
    setAt(i);
    onScrub?.(pts[i]);
  };
  const end = () => { setAt(null); onScrub?.(null); };
  const pan = Gesture.Pan().minDistance(0)
    .onBegin((e) => { runOnJS(pick)(e.x); })
    .onUpdate((e) => { runOnJS(pick)(e.x); })
    .onFinalize(() => { runOnJS(end)(); });

  if (n < 2) return <View style={[{ height, alignItems: 'center', justifyContent: 'center' }]}><Text style={s.small}>No chart data</Text></View>;
  return (
    <View style={{ gap: 6 }}>
      <GestureDetector gesture={pan}>
        <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel="Price chart. Drag to read the price at any point">
          {w > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={w} height={height}>
                <Defs>
                  <LinearGradient id={`p${id}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Line x1={0} x2={w} y1={y(ref)} y2={y(ref)} stroke={Corpus.border} strokeWidth={1} strokeDasharray="3 4" />
                <APath d={`${line} L ${w} ${height} L 0 ${height} Z`} fill={`url(#p${id})`} animatedProps={fillProps} />
                <APath d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={lineProps} />
                {at != null && (
                  <>
                    <Line x1={x(at)} x2={x(at)} y1={0} y2={height} stroke={Corpus.textMuted} strokeWidth={1} />
                    <Circle cx={x(at)} cy={y(pts[at].c)} r={5} fill={color} stroke={Corpus.card} strokeWidth={2.5} />
                  </>
                )}
                {at == null && <Circle cx={x(n - 1)} cy={y(vals[n - 1])} r={4} fill={color} />}
              </Svg>
            </View>
          )}
        </View>
      </GestureDetector>
      <View style={s.foot}>
        <Text style={s.small}>Low {lo.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
        <Text style={s.small}>High {hi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  foot: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: Type.small, color: Corpus.textMuted, fontFamily: Font.display, ...tabular },
});

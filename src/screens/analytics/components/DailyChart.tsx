import { ChartColors } from '@/constants/chartColors';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { DayPoint } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const HEIGHT = 128;
type Props = { points: DayPoint[]; average: number; monthKey: string; budget?: number };

// One column per day. Drag across the chart (or tap) to read any day: its amount, and how much
// had gone out by then. The bars rise from the baseline when you switch months.
export default function DailyChart({ points, average, monthKey, budget }: Props) {
  const [sel, setSel] = useState<number | null>(null);
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const rise = useSharedValue(reduce ? 1 : 0);
  const max = Math.max(...points.map((p) => p.amount), average, 1);
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5)) - 1;
  const cum = useMemo(() => points.reduce<number[]>((a, p) => [...a, (a[a.length - 1] ?? 0) + p.amount], []), [points]);
  const n = points.length;

  useEffect(() => {
    setSel(null);
    if (reduce) { rise.value = 1; return; }
    rise.value = 0;
    rise.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [monthKey, reduce, rise]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleY: rise.value }] }));

  const pick = (x: number) => {
    if (!w) return;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x / w) * n)));
    if (points[i].future) return;
    setSel(i);
  };
  const pan = Gesture.Pan().activeOffsetX([-4, 4]).failOffsetY([-12, 12])
    .onBegin((e) => { runOnJS(pick)(e.x); })
    .onUpdate((e) => { runOnJS(pick)(e.x); });
  const tap = Gesture.Tap().onEnd((e) => { runOnJS(pick)(e.x); });

  const p = sel != null ? points[sel] : null;
  const date = p ? new Date(y, m, p.day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const by = sel != null ? cum[sel] : 0;

  return (
    <View style={s.wrap}>
      <View style={s.read}>
        <View style={{ flex: 1 }}>
          <Text style={s.readLabel}>{p ? date : 'Daily average'}</Text>
          <Text style={s.readNum}>{p ? (p.amount > 0 ? formatINR(Math.round(p.amount)) : 'Nothing') : formatINR(Math.round(average))}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.readLabel}>{p ? 'Spent by then' : 'Drag across the days'}</Text>
          {p ? (
            <Text style={s.readSide}>{formatINR(Math.round(by))}{budget ? <Text style={[s.readLabel, by > budget && { color: Corpus.danger }]}>{`  ${Math.round((by / budget) * 100)}% of budget`}</Text> : null}</Text>
          ) : null}
        </View>
      </View>

      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View style={s.plot} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityLabel="Daily spending. Drag to read a day.">
          {average > 0 && <View pointerEvents="none" style={[s.avg, { bottom: (average / max) * HEIGHT }]} />}
          <Animated.View style={[s.bars, { transformOrigin: 'bottom' }, grow]}>
            {points.map((d, i) => {
              const h = d.amount > 0 ? Math.max((d.amount / max) * HEIGHT, 3) : 0;
              const on = sel === i;
              return (
                <View key={d.day} style={s.slot}>
                  {d.future
                    ? <View style={[s.bar, { height: 3, backgroundColor: ChartColors.future }]} />
                    : <View style={[s.bar, { height: h, backgroundColor: on ? Corpus.text : ChartColors.spend, opacity: sel == null || on ? 1 : 0.35 }]} />}
                </View>
              );
            })}
          </Animated.View>
          {sel != null && w > 0 && <View pointerEvents="none" style={[s.cross, { left: ((sel + 0.5) / n) * w }]} />}
        </View>
      </GestureDetector>

      <View style={s.axis}>
        {[1, 8, 15, 22, n].map((d) => <Text key={d} style={[s.tick, { left: `${((d - 0.5) / n) * 100}%` }]}>{d}</Text>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  read: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, minHeight: 44 },
  readLabel: { fontSize: Type.small, color: Corpus.textMuted },
  readNum: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  readSide: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text, ...tabular },
  plot: { height: HEIGHT, borderBottomWidth: 1, borderBottomColor: ChartColors.grid },
  bars: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1 },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  avg: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: Corpus.textMuted },
  cross: { position: 'absolute', top: 0, bottom: 0, width: 1, marginLeft: -0.5, backgroundColor: Corpus.textMuted },
  axis: { height: 14 },
  tick: { position: 'absolute', fontSize: Type.micro, color: Corpus.textFaint, transform: [{ translateX: -4 }] },
});

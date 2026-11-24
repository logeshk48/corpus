import { Chip, Corpus, Font, Heat, isDark, tabular, Type } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { yearDays, type DayCell } from '@/utils/yearDays';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const BG = isDark ? Corpus.card : Corpus.text; // a dark card in both themes, like the Today numbers
const FG = Corpus.sheen;
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
type Mode = 'good' | 'spend';

function fill(c: DayCell, mode: Mode) {
  if (c.state !== 'day') return 'transparent';
  if (mode === 'good') return c.good === 0 ? Heat.over : Heat.good[c.good - 1];
  return c.spend === 0 ? FG + '12' : Heat.spend[c.spend - 1];
}

// Today's cell breathes so you can find yourself on the grid
function TodayPulse({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.value = withRepeat(withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(o);
  }, [reduce, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[s.pulse, { borderColor: color, shadowColor: color }, st]} />;
}

// A year of days as a grid, one column per week. Tap a day to see what happened.
export default function YearHeatmap({ tx, budget }: { tx: Transaction[]; budget?: number }) {
  const y = useMemo(() => yearDays(tx, budget), [tx, budget]);
  const [mode, setMode] = useState<Mode>('good');
  const [sel, setSel] = useState<DayCell | null>(null);
  const scroll = useRef<ScrollView>(null);
  const todayKey = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }, []);
  const months = y.months.filter((m, i, a) => i === 0 || m.col - a[i - 1].col >= 3);
  const accent = mode === 'good' ? Heat.good[3] : Heat.spend[3];

  const readout = sel
    ? {
        title: sel.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        line: sel.spent === 0 ? 'Nothing spent'
          : `${formatINR(Math.round(sel.spent))} over ${sel.count} ${sel.count === 1 ? 'entry' : 'entries'}${sel.spent > sel.ref ? `, ${(sel.spent / sel.ref).toFixed(1)}x your ${y.hasBudget ? 'daily budget' : 'usual day'}` : ''}`,
        color: sel.spent === 0 ? Heat.good[3] : sel.spent > sel.ref ? Heat.over : FG,
      }
    : null;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Your year in days</Text>
          <Text style={s.sub}>{mode === 'good' ? `Under ${y.hasBudget ? 'your daily budget' : 'your usual day'} on ${y.goodDays} of ${y.tracked} days` : `${y.tracked - y.noSpend} spending days, ${y.noSpend} with nothing spent`}</Text>
        </View>
        <View style={s.toggle} accessibilityRole="tablist">
          {(['good', 'spend'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[s.tBtn, mode === m && s.tOn]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
              <Text style={[s.tText, mode === m && { color: BG }]}>{m === 'good' ? 'Good days' : 'Spending'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.stats}>
        <View style={s.stat}><Text style={[s.statNum, { color: Heat.good[3] }]}>{y.run}</Text><Text style={s.statLabel}>day run now</Text></View>
        <View style={s.stat}><Text style={s.statNum}>{y.best}</Text><Text style={s.statLabel}>best run</Text></View>
        <View style={s.stat}><Text style={s.statNum}>{y.noSpend}</Text><Text style={s.statLabel}>no-spend days</Text></View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <View style={s.rowLabels}>
          {ROW_LABELS.map((l, i) => <Text key={i} style={s.rowLabel}>{l}</Text>)}
        </View>
        <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          <Animated.View entering={FadeIn.duration(500)}>
            <View style={{ height: 16, width: y.weeks.length * STEP }}>
              {months.map((m) => <Text key={m.col} style={[s.month, { left: m.col * STEP }]}>{m.label}</Text>)}
            </View>
            <View style={{ flexDirection: 'row', gap: GAP }}>
              {y.weeks.map((col, c) => (
                <View key={c} style={{ gap: GAP }}>
                  {col.map((d) => {
                    const on = sel?.key === d.key;
                    if (d.state === 'future') return <View key={d.key} style={s.cell} />;
                    return (
                      <Pressable
                        key={d.key}
                        onPress={() => setSel(on ? null : d)}
                        disabled={d.state !== 'day'}
                        hitSlop={1}
                        style={[s.cell, { backgroundColor: fill(d, mode) }, d.state === 'before' && s.before, on && { borderWidth: 2, borderColor: FG }]}
                        accessibilityLabel={d.state === 'day' ? `${d.date.toDateString()}, ${d.spent ? formatINR(Math.round(d.spent)) : 'nothing spent'}` : undefined}
                      >
                        {d.key === todayKey && <TodayPulse color={accent} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <View style={s.foot}>
        {readout ? (
          <Animated.View key={sel?.key} entering={FadeIn.duration(180)} style={{ flex: 1 }}>
            <Text style={s.readTitle}>{readout.title}</Text>
            <Text style={[s.readLine, { color: readout.color }]}>{readout.line}</Text>
          </Animated.View>
        ) : (
          <Text style={[s.hint, { flex: 1 }]}>Tap any day</Text>
        )}
        <View style={s.legend}>
          {mode === 'good' ? (
            <>
              <View style={[s.lCell, { backgroundColor: Heat.over }]} />
              <Text style={s.lText}>Over</Text>
              {Heat.good.map((c) => <View key={c} style={[s.lCell, { backgroundColor: c }]} />)}
              <Text style={s.lText}>Nothing</Text>
            </>
          ) : (
            <>
              <Text style={s.lText}>Less</Text>
              {Heat.spend.map((c) => <View key={c} style={[s.lCell, { backgroundColor: c }]} />)}
              <Text style={s.lText}>More</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: BG, borderRadius: 24, padding: 16, gap: 14, overflow: 'hidden', shadowColor: Chip.green, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: FG },
  sub: { fontSize: Type.small, color: FG, opacity: 0.65, marginTop: 2 },
  toggle: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: FG + '14' },
  tBtn: { paddingHorizontal: 10, height: 26, borderRadius: 11, justifyContent: 'center' },
  tOn: { backgroundColor: FG },
  tText: { fontSize: Type.caption, fontFamily: Font.display, color: FG },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: FG + '0F', borderWidth: 0.5, borderColor: FG + '1F' },
  statNum: { fontSize: Type.h2, fontFamily: Font.displayBold, color: FG, ...tabular },
  statLabel: { fontSize: Type.caption, color: FG, opacity: 0.6 },
  rowLabels: { paddingTop: 16, gap: GAP, marginRight: 6 },
  rowLabel: { height: CELL, fontSize: Type.micro, lineHeight: CELL, color: FG, opacity: 0.5 },
  month: { position: 'absolute', top: 0, fontSize: Type.micro, color: FG, opacity: 0.6 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  before: { borderWidth: 1, borderColor: FG + '14' },
  pulse: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 5, borderWidth: 1.5, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  readTitle: { fontSize: Type.body, fontFamily: Font.display, color: FG },
  readLine: { fontSize: Type.small, marginTop: 1 },
  hint: { fontSize: Type.small, color: FG, opacity: 0.5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lCell: { width: 10, height: 10, borderRadius: 2 },
  lText: { fontSize: Type.micro, color: FG, opacity: 0.6, marginHorizontal: 2 },
});

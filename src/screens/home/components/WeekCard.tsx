import { Tap } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const H = 88;

// Spending for each day of this week (Monday first), and last week up to the same day for comparison
export function weekSpend(tx: Transaction[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const todayIdx = (today.getDay() + 6) % 7;
  let last = 0;
  for (const t of tx) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.date);
    const i = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - monday.getTime()) / 86_400_000);
    if (i >= 0 && i < 7) sums[i] += t.amount;
    else if (i >= -7 && i < -7 + todayIdx + 1) last += t.amount;
  }
  const total = sums.reduce((a, b) => a + b, 0);
  return { sums, todayIdx, total, avg: total / (todayIdx + 1), last };
}

function Bar({ h, color, i }: { h: number; color: string; i: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? h : 0);
  useEffect(() => { v.value = reduce ? h : withDelay(i * 50, withSpring(h, { damping: 18, stiffness: 140 })); }, [h, i, reduce, v]);
  const st_ = useAnimatedStyle(() => ({ height: v.value }));
  return <Animated.View style={[st.bar, { backgroundColor: color }, st_]} />;
}

// This week: one bar per day, today in orange, days still to come as faint dots.
// The line under the total compares with last week up to the same day.
export default function WeekCard({ tx, onPress }: { tx: Transaction[]; onPress: () => void }) {
  const w = weekSpend(tx);
  const max = Math.max(...w.sums, 1);
  const diff = w.total - w.last;
  const vs = w.last === 0 && w.total === 0 ? 'Nothing spent yet this week'
    : w.last === 0 ? 'Nothing by this day last week'
    : diff === 0 ? 'Same as last week by this day'
    : `${formatINR(Math.round(Math.abs(diff)))} ${diff > 0 ? 'more' : 'less'} than last week by this day`;
  return (
    <Tap onPress={onPress} scaleTo={0.99} style={st.card} accessibilityRole="button" accessibilityLabel={`This week ${formatINR(Math.round(w.total))} spent. ${vs}`}>
      <View style={st.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.title}>This week</Text>
          <Text style={st.big}>{formatINR(Math.round(w.total))}</Text>
          <Text style={[st.sub, w.last > 0 && diff !== 0 && { color: diff > 0 ? Corpus.warning : Corpus.income }]}>{vs}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
      </View>
      <View style={st.bars}>
        {w.sums.map((v, i) => {
          const future = i > w.todayIdx;
          const today = i === w.todayIdx;
          return (
            <View key={i} style={st.col}>
              <Text style={[st.val, today && st.valOn]} numberOfLines={1}>{v > 0 ? compactINR(Math.round(v)) : ''}</Text>
              <View style={st.slot}>
                {future ? <View style={st.dot} />
                  : v > 0 ? <Bar h={Math.max(6, (v / max) * H)} i={i} color={today ? Chip.orange : Chip.indigo} />
                  : <View style={st.zero} />}
              </View>
              <Text style={[st.day, today && st.dayOn]}>{DAYS[i]}</Text>
            </View>
          );
        })}
      </View>
    </Tap>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: 16, gap: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.textMuted },
  big: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.6, ...tabular },
  sub: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  bars: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  slot: { height: H, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', maxWidth: 30, borderRadius: 8 },
  zero: { width: '100%', maxWidth: 30, height: 4, borderRadius: 2, backgroundColor: Corpus.cardAlt },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Corpus.cardAlt, marginBottom: 0 },
  val: { fontSize: Type.micro, color: Corpus.textMuted, height: 13, ...tabular },
  valOn: { color: Corpus.text, fontFamily: Font.display },
  day: { fontSize: Type.small, color: Corpus.textMuted },
  dayOn: { color: Corpus.text, fontFamily: Font.displayBold },
});

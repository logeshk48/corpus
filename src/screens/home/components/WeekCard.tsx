import { Tap } from '@/components/ui';
import { Chip, Corpus, Font, Space, Type } from '@/constants/theme';
import { useEffect, useId } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Spending for each day of this week (Mon–Sun), today highlighted — Apple Health style bars
export function weekSpend(tx: Transaction[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sums = [0, 0, 0, 0, 0, 0, 0];
  for (const t of tx) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.date);
    const i = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - monday.getTime()) / 86_400_000);
    if (i >= 0 && i < 7) sums[i] += t.amount;
  }
  const todayIdx = (today.getDay() + 6) % 7;
  const total = sums.reduce((a, b) => a + b, 0);
  return { sums, todayIdx, total, avg: total / (todayIdx + 1) };
}

function Bar({ h, color, i, glow }: { h: number; color: string; i: number; glow?: boolean }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const v = useSharedValue(reduce ? h : 0);
  useEffect(() => { v.value = reduce ? h : withDelay(i * 55, withSpring(h, { damping: 16, stiffness: 120 })); }, [h, i, reduce, v]);
  const st_ = useAnimatedStyle(() => ({ height: v.value }));
  return (
    <Animated.View style={[st.bar, glow && { shadowColor: color, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }, st_]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`w${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Corpus.sheen} stopOpacity={0.3} />
            <Stop offset="0.25" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx="6" fill={`url(#w${id})`} />
      </Svg>
    </Animated.View>
  );
}

const H = 96;
export default function WeekCard({ tx, onPress }: { tx: Transaction[]; onPress: () => void }) {
  const w = weekSpend(tx);
  const max = Math.max(...w.sums, w.avg, 1);
  return (
    <Tap onPress={onPress} style={st.card} accessibilityRole="button" accessibilityLabel={`This week ${formatINR(Math.round(w.total))} spent, about ${formatINR(Math.round(w.avg))} a day`}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>This week</Text>
          {w.total > 0 ? (
            <Text style={st.sub}><Text style={st.big}>{formatINR(Math.round(w.total))}</Text>  about {formatINR(Math.round(w.avg))} a day</Text>
          ) : (
            <Text style={st.sub}>Nothing spent yet this week</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
      </View>
      <View style={st.bars}>
        {w.avg > 0 && <View pointerEvents="none" style={[st.avg, { bottom: 22 + (w.avg / max) * H }]} />}
        {w.sums.map((v, i) => (
          <View key={i} style={st.col}>
            <View style={st.track}>
              {v > 0 && <Bar h={Math.max(6, (v / max) * H)} i={i} color={i === w.todayIdx ? Chip.orange : Chip.indigo} glow={i === w.todayIdx} />}
            </View>
            <Text style={[st.day, i === w.todayIdx && st.dayOn]}>{DAYS[i]}</Text>
          </View>
        ))}
      </View>
      {w.avg > 0 && (
        <View style={st.legend}>
          <View style={st.dash} /><Text style={st.sub}>Your average day this week</Text>
        </View>
      )}
    </Tap>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: Space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted, marginTop: 2 },
  big: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text },
  bars: { flexDirection: 'row', gap: 10, height: H + 22 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: { height: H, width: '100%', justifyContent: 'flex-end', borderRadius: 6, backgroundColor: Corpus.bg },
  bar: { width: '100%', borderRadius: 6, overflow: 'hidden' },
  avg: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textMuted, zIndex: 2 },
  day: { fontSize: Type.small, color: Corpus.textMuted },
  dayOn: { color: Corpus.text, fontFamily: Font.displayBold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  dash: { width: 16, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textMuted },
});

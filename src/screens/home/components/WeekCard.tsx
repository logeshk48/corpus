import { useEntrance } from '@/hooks/useEntrance';
import { Corpus, Font, Space, Type } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

export default function WeekCard({ tx, onPress }: { tx: Transaction[]; onPress: () => void }) {
  const w = weekSpend(tx);
  const t = useEntrance(900);
  const max = Math.max(...w.sums, 1);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.card, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button" accessibilityLabel={`This week ${formatINR(Math.round(w.total))} spent, about ${formatINR(Math.round(w.avg))} a day`}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>This week</Text>
          <Text style={st.sub}>
            <Text style={st.big}>{formatINR(Math.round(w.total))}</Text>  ·  about {formatINR(Math.round(w.avg))} a day
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
      </View>
      <View style={st.bars}>
        {w.sums.map((v, i) => (
          <View key={i} style={st.col}>
            <View style={st.track}>
              <View style={[st.bar, { height: `${Math.max(v > 0 ? 6 : 0, (v / max) * 100 * t)}%`, backgroundColor: i === w.todayIdx ? Corpus.gold : i < w.todayIdx ? Corpus.goldSoft : Corpus.cardAlt }]} />
            </View>
            <Text style={[st.day, i === w.todayIdx && st.dayOn]}>{DAYS[i]}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: Space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: Type.h3, fontFamily: Font.display, fontWeight: '700', color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted, marginTop: 2 },
  big: { fontSize: Type.label, fontWeight: '700', color: Corpus.text },
  bars: { flexDirection: 'row', gap: 10, height: 96 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', borderRadius: 6, backgroundColor: Corpus.bg },
  bar: { width: '100%', borderRadius: 6 },
  day: { fontSize: Type.small, color: Corpus.textMuted, fontWeight: '500' },
  dayOn: { color: Corpus.gold, fontWeight: '700' },
});

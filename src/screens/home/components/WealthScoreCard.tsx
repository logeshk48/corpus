import { ActivityRing } from '@/components/ui';
import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { pointsFor, type WealthScore } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TONE = { good: Corpus.income, ok: Corpus.warning, weak: Corpus.danger };
const PART = { good: Corpus.income, ok: Corpus.warning, weak: Corpus.danger, unknown: Corpus.cardAlt };

// The score, its band, the five parts as little bars, and the one next step
export default function WealthScoreCard({ s, onPress }: { s: WealthScore; onPress: () => void }) {
  // one part alone (e.g. only "no debt") would read as 100, so wait for at least two
  if (s.known < 2) return null;
  const c = TONE[s.tone];
  return (
    <Pressable style={({ pressed }) => [st.card, pressed && { transform: [{ scale: 0.98 }] }]} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`Wealth score ${s.score} out of 100, ${s.grade}.${s.topFix ? ` Next step: ${s.topFix.fix}` : ''}`}>
      <View style={st.top}>
        <View style={st.ring}>
          <ActivityRing size={56} thickness={7} progress={s.score / 100} color={c} track={Corpus.cardAlt} />
          <Text style={st.num}>{s.score}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.title}>Wealth score <Text style={{ color: c }}>{s.grade}</Text></Text>
          <View style={st.bars}>
            {s.pillars.map((p) => (
              <View key={p.id} style={st.barBg}>
                {p.known && <View style={[st.barFill, { width: `${(p.score / p.max) * 100}%`, backgroundColor: PART[p.status] }]} />}
              </View>
            ))}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
      </View>
      {s.topFix && (
        <Text style={st.fix} numberOfLines={2}>
          <Text style={st.strong}>Next: </Text>{s.topFix.fix}. <Text style={{ color: Corpus.income, fontFamily: Font.display }}>+{pointsFor(s, s.topFix)}</Text>
        </Text>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  num: { position: 'absolute', fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  title: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text },
  bars: { flexDirection: 'row', gap: 4 },
  barBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  fix: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, ...tabular },
  strong: { fontFamily: Font.display, color: Corpus.text },
});

import { Corpus, Radius, Space, Type } from '@/constants/theme';
import type { WealthScore } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TONE = { good: Corpus.income, ok: Corpus.gold, weak: Corpus.warning };

// "Wealth score 66 · Strong" + five little bars + the biggest fix
export default function WealthScoreCard({ s, onPress }: { s: WealthScore; onPress: () => void }) {
  if (s.known === 0) return null;
  const c = TONE[s.tone];
  return (
    <Pressable style={st.card} onPress={onPress}>
      <View style={st.top}>
        <View style={[st.ring, { borderColor: c }]}>
          <Text style={[st.num, { color: c }]}>{s.score}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.title}>
            Wealth score · <Text style={{ color: c }}>{s.grade}</Text>
          </Text>
          <View style={st.bars}>
            {s.pillars.map((p) => (
              <View key={p.id} style={st.barBg}>
                {p.known && <View style={[st.barFill, { width: `${(p.score / p.max) * 100}%`, backgroundColor: p.score >= 14 ? Corpus.income : p.score >= 8 ? Corpus.gold : Corpus.warning }]} />}
              </View>
            ))}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
      </View>
      {s.topFix && (
        <Text style={st.fix} numberOfLines={2}>
          <Text style={{ color: Corpus.gold, fontWeight: '600' }}>Next: </Text>
          {s.topFix.fix} <Text style={{ color: Corpus.textFaint }}>(+{Math.round((s.topFix.gain / (s.known * 20)) * 100)} pts)</Text>
        </Text>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: Type.h3, fontWeight: '700' },
  title: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  bars: { flexDirection: 'row', gap: 4 },
  barBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  fix: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});

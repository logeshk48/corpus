import { Corpus, Radius, Space, Type } from '@/constants/theme';
import type { debtPlanSummary } from '@/utils/debtPlan';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// "Debt-free by Aug 2028 · Pay this first: SBI Card ₹50,000"
export default function DebtPlanCard({ s, onPress }: { s: NonNullable<ReturnType<typeof debtPlanSummary>>; onPress: () => void }) {
  return (
    <Pressable style={st.card} onPress={onPress}>
      <View style={st.row}>
        <View style={st.icon}>
          <Ionicons name="flag-outline" size={16} color={Corpus.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>
            {s.freeBy ? `Debt-free by ${s.freeBy.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : `${compactINR(s.totals.total)} owed`}
          </Text>
          <Text style={st.sub}>{compactINR(s.totals.total)} across {s.list.length} debt{s.list.length > 1 ? 's' : ''} · {formatINR(s.totals.interest)}/month in interest</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
      </View>
      {s.first && (
        <Text style={st.fix} numberOfLines={2}>
          <Text style={{ color: Corpus.gold, fontWeight: '600' }}>Pay this first: </Text>
          {s.first.name} · {formatINR(s.first.balance)}
          {s.first.rate ? ` · ${s.first.rate}%` : ''}
          {s.extra > 0 ? ` (+${formatINR(s.extra)} a month)` : ' — any extra money goes here'}
        </Text>
      )}
      {!s.freeBy && s.stuck.length > 0 && <Text style={[st.fix, { color: Corpus.danger }]}>{s.stuck[0]} isn’t going down — set an extra amount in your plan.</Text>}
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Corpus.dangerTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted },
  fix: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});

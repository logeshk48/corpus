import { Button } from '@/components/ui';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import type { DebtPlanSummary } from '@/utils/debtPlan';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  s: DebtPlanSummary;
  onOpen: () => void;
  onAnswer: (a: 'paid' | 'skipped') => Promise<void>;
  onSeenCleared: (ids: string[]) => void;
};
const my = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

// Home: your debt plan, month by month
export default function DebtPlanCard({ s, onOpen, onAnswer, onSeenCleared }: Props) {
  const [busy, setBusy] = useState<'paid' | 'skipped' | null>(null);
  const answer = async (a: 'paid' | 'skipped') => {
    setBusy(a);
    try {
      await onAnswer(a);
    } finally {
      setBusy(null);
    }
  };

  // 🎉 a debt from your plan is gone
  if (s.newCleared.length) {
    const c = s.newCleared[0];
    return (
      <View style={[st.card, { borderColor: Corpus.incomeLine, backgroundColor: Corpus.incomeTint }]}>
        <Text style={st.big}>🎉 {c.name} is cleared!</Text>
        <Text style={st.sub}>
          {formatINR(c.balance)} paid off.{' '}
          {s.first ? `Its monthly payment now rolls into ${s.first.name} — keep paying the same total and the next one goes faster.` : 'That was your last debt in the plan — you’re debt-free.'}
          {s.freeBy && s.list.length ? ` Debt-free by ${my(s.freeBy)}.` : ''}
        </Text>
        <Button size="sm" label="Nice" icon="checkmark" onPress={() => onSeenCleared(s.newCleared.map((x) => x.id))} />
      </View>
    );
  }
  if (!s.list.length) return null;

  return (
    <Pressable style={st.card} onPress={onOpen}>
      <View style={st.row}>
        <View style={st.icon}>
          <Ionicons name="flag-outline" size={16} color={Corpus.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{s.freeBy ? `Debt-free by ${my(s.freeBy)}` : `${compactINR(s.totals.total)} owed`}</Text>
          <Text style={st.sub}>
            {compactINR(s.totals.total)} left · {formatINR(s.totals.interest)}/month in interest
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
      </View>

      {s.startTotal > 0 && s.started && (
        <View style={{ gap: 4 }}>
          <View style={st.barBg}>
            <View style={[st.barFill, { width: `${Math.max(2, s.pct * 100)}%` }]} />
          </View>
          <Text style={st.sub}>
            <Text style={{ color: Corpus.income, fontWeight: '600' }}>{formatINR(Math.round(s.paidOff))} paid off</Text> since {my(s.started)} · {Math.round(s.pct * 100)}% done
            {s.cleared.length ? ` · ${s.cleared.length} cleared` : ''}
            {s.streak > 1 ? ` · extra paid ${s.streak} months in a row 🔥` : ''}
          </Text>
        </View>
      )}

      {s.first && !s.askNow && (
        <Text style={st.fix} numberOfLines={2}>
          <Text style={{ color: Corpus.gold, fontWeight: '600' }}>Pay this first: </Text>
          {s.first.name} · {formatINR(s.first.balance)}
          {s.first.rate ? ` · ${s.first.rate}%` : ''}
          {s.extra > 0 ? ` (+${formatINR(s.extra)} a month)` : ' — set an extra amount in your plan'}
          {s.answered === 'paid' ? ' · ✓ done this month' : s.answered === 'skipped' ? ' · skipped this month' : ''}
        </Text>
      )}

      {s.askNow && s.first && (
        <View style={st.ask}>
          <Text style={st.title}>Did you put the extra {formatINR(s.extra)} into {s.first.name} this month?</Text>
          {s.skipCost && (s.skipCost.months > 0 || s.skipCost.interest > 0) && (
            <Text style={st.sub}>
              Skipping it costs about {formatINR(Math.max(0, s.skipCost.interest))} more interest
              {s.skipCost.months > 0 ? ` and pushes debt-free back ${s.skipCost.months} month${s.skipCost.months > 1 ? 's' : ''}` : ''}.
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button style={{ flex: 1 }} size="sm" icon="checkmark" label="Yes, paid" loading={busy === 'paid'} onPress={() => answer('paid')} />
            <Button style={{ flex: 1 }} size="sm" variant="secondary" label="Not this month" loading={busy === 'skipped'} onPress={() => answer('skipped')} />
          </View>
          <Text style={st.note}>Then update the balance in {s.first.kind === 'card' ? 'Accounts' : s.first.kind === 'person' ? 'Lent & borrowed (add a repayment)' : 'the loan (add a prepayment)'} so the plan uses the new amount.</Text>
        </View>
      )}

      {!s.freeBy && s.stuck.length > 0 && <Text style={[st.fix, { color: Corpus.danger }]}>{s.stuck[0]} isn’t going down — set an extra amount in your plan.</Text>}
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Corpus.dangerTint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  big: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  fix: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  note: { fontSize: Type.caption, color: Corpus.textFaint, lineHeight: 15 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Corpus.income },
  ask: { backgroundColor: Corpus.goldTint, borderRadius: Radius.md, padding: Space.sm + 4, gap: 8 },
});

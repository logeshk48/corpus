import { IconChip, Tap } from '@/components/ui';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import type { DebtPlanSummary } from '@/utils/debtPlan';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { needStyles } from './CatchUpCard';

type Props = {
  s: DebtPlanSummary;
  onOpen: () => void;
  onAnswer: (a: 'paid' | 'skipped') => Promise<void>;
  onSeenCleared: (ids: string[]) => void;
};
const my = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

// The debt plan only shows on Today when it needs you: a debt just cleared, this month's extra
// payment to confirm, or a debt that isn't going down. The date you'll be debt-free lives in Your numbers.
export const debtNeedsYou = (s: DebtPlanSummary) => s.newCleared.length > 0 || (s.askNow && !!s.first) || (!s.freeBy && s.stuck.length > 0 && s.list.length > 0);

function Pill({ label, onPress, busy, primary }: { label: string; onPress: () => void; busy?: boolean; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [st.pill, primary ? st.pillOn : st.pillOff, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      {busy ? <ActivityIndicator size="small" color={primary ? Corpus.bg : Corpus.text} /> : <Text style={[st.pillText, primary && { color: Corpus.bg }]}>{label}</Text>}
    </Pressable>
  );
}

export default function DebtPlanCard({ s, onOpen, onAnswer, onSeenCleared }: Props) {
  const [busy, setBusy] = useState<'paid' | 'skipped' | null>(null);
  const answer = async (a: 'paid' | 'skipped') => {
    setBusy(a);
    try { await onAnswer(a); } finally { setBusy(null); }
  };

  if (s.newCleared.length) {
    const c = s.newCleared[0];
    return (
      <View style={[needStyles.card, st.col, { backgroundColor: Corpus.incomeTint, borderColor: Corpus.incomeLine }]}>
        <View style={st.row}>
          <IconChip icon="checkmark" color={Chip.green} size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={needStyles.title}>{c.name} is cleared</Text>
            <Text style={needStyles.text}>
              {formatINR(c.balance)} paid off. {s.first ? `Its payment now goes to ${s.first.name}, so that clears faster too.` : 'That was the last debt in your plan.'}
              {s.freeBy && s.list.length ? ` Debt-free by ${my(s.freeBy)}.` : ''}
            </Text>
          </View>
        </View>
        <View style={st.actions}><Pill primary label="Nice" onPress={() => onSeenCleared(s.newCleared.map((x) => x.id))} /></View>
      </View>
    );
  }

  if (s.askNow && s.first) {
    const where = s.first.kind === 'card' ? 'Accounts' : s.first.kind === 'person' ? 'Lent and borrowed' : 'the loan';
    return (
      <View style={[needStyles.card, st.col]}>
        <Tap onPress={onOpen} scaleTo={0.99} style={st.row} accessibilityRole="button">
          <IconChip icon="flag" color={Chip.pink} size={38} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={needStyles.title}>Paid the extra {formatINR(s.extra)} into {s.first.name}?</Text>
            <Text style={needStyles.text}>
              {s.skipCost && (s.skipCost.months > 0 || s.skipCost.interest > 0)
                ? `Skipping costs about ${formatINR(Math.max(0, s.skipCost.interest))} more interest${s.skipCost.months > 0 ? ` and ${s.skipCost.months} more month${s.skipCost.months > 1 ? 's' : ''}` : ''}.`
                : 'This month in your debt plan.'}
            </Text>
          </View>
        </Tap>
        <View style={st.actions}>
          <Pill primary label="Yes, paid" busy={busy === 'paid'} onPress={() => answer('paid')} />
          <Pill label="Not this month" busy={busy === 'skipped'} onPress={() => answer('skipped')} />
        </View>
        <Text style={st.note}>Then update the balance in {where} so the plan uses the new amount.</Text>
      </View>
    );
  }

  if (!s.freeBy && s.stuck.length > 0 && s.list.length > 0) {
    return (
      <Tap onPress={onOpen} scaleTo={0.98} style={needStyles.card} accessibilityRole="button">
        <IconChip icon="alert" color={Chip.red} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={needStyles.title}>{s.stuck[0]} isn't going down</Text>
          <Text style={needStyles.text}>At the current payments it won't clear. Set an extra amount in your plan.</Text>
        </View>
        <View style={needStyles.btn}><Text style={needStyles.btnText}>Fix</Text></View>
      </Tap>
    );
  }
  return null;
}

const st = StyleSheet.create({
  col: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 8, paddingLeft: 50 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: Corpus.text },
  pillOff: { borderWidth: 1, borderColor: Corpus.border },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  note: { fontSize: Type.small, color: Corpus.textFaint, paddingLeft: 50 },
});

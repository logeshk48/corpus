import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import type { Investment } from '@/types/investment';
import { investMeta } from '@/types/investment';
import type { InvestGoal } from '@/types/settings';
import { compactINR, formatINR } from '@/utils/format';
import { EXPECTED, futureValue, monthsUntil, sipNeeded } from '@/utils/returns';
import { sipAmount } from '@/utils/sip';
import { Pressable, Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';
import { m } from './Market.styles';

export function goalStatus(g: InvestGoal, list: Investment[], now = new Date()) {
  const linked = list.filter((h) => h.goalId === g.id);
  const pv = linked.reduce((a, h) => a + h.value, 0);
  const monthly = linked.reduce((a, h) => (h.sip?.active ? a + sipAmount(h.sip, now) : a), 0);
  // expected return = value-weighted by asset class (equity 12, debt 7…); 10% if nothing linked yet
  const rate = pv > 0 ? linked.reduce((a, h) => a + h.value * (EXPECTED[investMeta(h.type).cls] ?? 8), 0) / pv : 10;
  const months = monthsUntil(g.by, now);
  const projected = futureValue(pv, monthly, rate, months);
  const need = sipNeeded(g.target, pv, rate, months);
  return { linked, pv, monthly, rate, months, projected, need, onTrack: projected >= g.target, progress: Math.min(1, pv / g.target) };
}

export default function GoalsCard({ goals, list, onAdd, onOpen }: { goals: InvestGoal[]; list: Investment[]; onAdd: () => void; onOpen: (g: InvestGoal) => void }) {
  return (
    <View style={styles.card}>
      <View style={m.statusRow}>
        <Text style={styles.name}>Goals</Text>
        <Button size="sm" variant="ghost" icon="add" label="Goal" onPress={onAdd} />
      </View>
      {goals.length === 0 && <Text style={m.small}>Link investments to a goal (a house, a child’s education, retiring early) and see if you’ll get there and what SIP it takes.</Text>}
      {goals.map((g) => {
        const s = goalStatus(g, list);
        const by = new Date(g.by).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        return (
          <Pressable key={g.id} style={[m.position, { gap: 6 }]} onPress={() => onOpen(g)}>
            <View style={m.posRow}>
              <Text style={m.rowName}>{g.icon ?? '🎯'} {g.name}</Text>
              <Text style={m.small}>{compactINR(s.pv)} / {compactINR(g.target)}</Text>
            </View>
            <View style={[m.bar, { marginTop: 0, height: 6, borderRadius: 3 }]}>
              <View style={{ width: `${s.progress * 100}%`, height: 6, borderRadius: 3, backgroundColor: s.onTrack ? Corpus.income : Corpus.gold }} />
            </View>
            {s.linked.length === 0 ? (
              <Text style={m.small}>Nothing linked yet. Needs about {formatINR(Math.round(s.need))}/month to reach by {by}.</Text>
            ) : s.months === 0 ? (
              <Text style={m.small}>{s.pv >= g.target ? '🎉 Reached!' : `Due now · ${formatINR(g.target - s.pv)} short`}</Text>
            ) : s.onTrack ? (
              <Text style={[m.small, { color: Corpus.income }]}>
                On track · about {compactINR(s.projected)} by {by}
                {s.monthly ? ` with ${formatINR(s.monthly)}/month` : ''}
              </Text>
            ) : (
              <Text style={[m.small, { color: Corpus.warning }]}>
                Heading for about {compactINR(s.projected)} by {by}. Need {formatINR(Math.round(s.need))}/month
                {s.monthly ? ` (${formatINR(Math.round(s.need - s.monthly))} more than now)` : ''}.
              </Text>
            )}
            <Text style={m.tiny}>Assumes ~{s.rate.toFixed(0)}% a year from what’s linked. Markets vary.</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

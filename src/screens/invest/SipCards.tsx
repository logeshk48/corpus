import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import type { Investment } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { AUTO_DAYS, monthlySipTotal, nextSip, type Instalment } from '@/utils/sip';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';
import { m } from './Market.styles';

const when = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// "Did your ₹5,000 SIP go through?" + what's coming up
export default function SipCards({ pending, list, onYes, onSkip }: { pending: Instalment[]; list: Investment[]; onYes: (p: Instalment) => Promise<void>; onSkip: (p: Instalment) => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const upcoming = list
    .map((h) => ({ h, n: nextSip(h) }))
    .filter((x) => x.n)
    .sort((a, b) => a.n!.date.getTime() - b.n!.date.getTime());
  const total = monthlySipTotal(list);
  if (!pending.length && !upcoming.length) return null;
  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={styles.card}>
      <View style={m.statusRow}>
        <Text style={styles.name}>SIPs</Text>
        <Text style={m.small}>{formatINR(total)} a month</Text>
      </View>
      {pending.map((p) => {
        const key = `${p.h.id}:${p.month}`;
        return (
          <View key={key} style={[m.position, { gap: 8 }]}>
            <Text style={m.rowName}>Did your {formatINR(p.amount)} SIP go through?</Text>
            <Text style={m.small}>
              {p.h.name} · {when(p.date)}
              {p.ageDays > 0 ? ` · assumed yes in ${Math.max(0, AUTO_DAYS - p.ageDays)} day${AUTO_DAYS - p.ageDays === 1 ? '' : 's'}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button style={{ flex: 1 }} size="sm" icon="checkmark" label="Yes, it went" loading={busy === key} onPress={() => act(key, () => onYes(p))} />
              <Button style={{ flex: 1 }} size="sm" variant="secondary" label="Skipped / failed" onPress={() => act(key, () => onSkip(p))} />
            </View>
          </View>
        );
      })}
      {upcoming.slice(0, 4).map(({ h, n }) => (
        <View key={h.id} style={m.posRow}>
          <Text style={[m.small, { flex: 1 }]} numberOfLines={1}>{h.name}</Text>
          <Text style={m.small}>
            {formatINR(n!.amount)} · {when(n!.date)}
          </Text>
        </View>
      ))}
      {upcoming.some(({ n }) => n!.date.getTime() - Date.now() < 2 * 86_400_000) && (
        <Text style={[m.tiny, { color: Corpus.warning }]}>A SIP is due within 2 days. Keep enough in the bank, or the mandate bounces and the bank charges a fee.</Text>
      )}
    </View>
  );
}

import { Button } from '@/components/ui';
import { Corpus, Font, Type } from '@/constants/theme';
import { Ticket } from '@/screens/home/components/UpcomingBills';
import type { Investment } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { AUTO_DAYS, monthlySipTotal, nextSip, type Instalment } from '@/utils/sip';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';
import { m } from './Market.styles';

const when = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// "Did your ₹5,000 SIP go through?" + what's coming up
export default function SipCards({ pending, list, onYes, onSkip, onOpen }: { pending: Instalment[]; list: Investment[]; onYes: (p: Instalment) => Promise<void>; onSkip: (p: Instalment) => Promise<void>; onOpen?: (h: Investment) => void }) {
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
  const soon = (d: Date) => {
    const n = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={st.head}>
        <Text style={st.heading}>SIPs coming up</Text>
        <Text style={m.small}>{formatINR(total)} a month</Text>
      </View>
      {pending.length > 0 && (
        <View style={styles.card}>
          {pending.map((p) => {
            const key = `${p.h.id}:${p.month}`;
            return (
              <View key={key} style={{ gap: 8 }}>
                <Text style={m.rowName}>Did your {formatINR(p.amount)} SIP go through?</Text>
                <Text style={m.small}>
                  {p.h.name}, {when(p.date)}
                  {p.ageDays > 0 ? `. Counted as done in ${Math.max(0, AUTO_DAYS - p.ageDays)} day${AUTO_DAYS - p.ageDays === 1 ? '' : 's'}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button style={{ flex: 1 }} size="sm" icon="checkmark" label="Yes, it went" loading={busy === key} onPress={() => act(key, () => onYes(p))} />
                  <Button style={{ flex: 1 }} size="sm" variant="secondary" label="Skipped or failed" onPress={() => act(key, () => onSkip(p))} />
                </View>
              </View>
            );
          })}
        </View>
      )}
      {upcoming.slice(0, 4).map(({ h, n }) => (
        <Ticket key={h.id} date={n!.date} tone="sip" name={h.name} sub={`SIP, ${soon(n!.date)}`} amount={formatINR(n!.amount)} onPress={() => onOpen?.(h)} />
      ))}
      {upcoming.some(({ n }) => n!.date.getTime() - Date.now() < 2 * 86_400_000) && (
        <Text style={[m.tiny, { color: Corpus.warning, paddingHorizontal: 4 }]}>A SIP is due within 2 days. Keep enough in the bank, or the mandate bounces and the bank charges a fee.</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  heading: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text },
});

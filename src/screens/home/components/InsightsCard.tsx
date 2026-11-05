import { Button } from '@/components/ui';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type Insight = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'gold' | 'warn' | 'danger' | 'good';
  title: string;
  body: string;
  yes: { label: string; run: () => Promise<void> };
  no?: { label: string; run: () => Promise<void> };
};
const C = { gold: Corpus.gold, warn: Corpus.warning, danger: Corpus.danger, good: Corpus.income };

// "Found for you" — things Corpus noticed, each with a one-tap action
export default function InsightsCard({ items }: { items: Insight[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const show = all ? items : items.slice(0, 2);
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={st.card}>
      <View style={st.head}>
        <Ionicons name="sparkles-outline" size={16} color={Corpus.gold} />
        <Text style={st.headText}>Found for you</Text>
        {items.length > 2 && (
          <Text style={st.more} onPress={() => setAll(!all)}>
            {all ? 'Show less' : `+${items.length - 2} more`}
          </Text>
        )}
      </View>
      {show.map((i) => (
        <View key={i.key} style={st.item}>
          <View style={st.row}>
            <Ionicons name={i.icon} size={16} color={C[i.tone]} />
            <Text style={st.title}>{i.title}</Text>
          </View>
          <Text style={st.body}>{i.body}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button style={{ flex: 1 }} size="sm" label={i.yes.label} loading={busy === `${i.key}:y`} onPress={() => run(`${i.key}:y`, i.yes.run)} />
            {i.no && <Button style={{ flex: 1 }} size="sm" variant="secondary" label={i.no.label} loading={busy === `${i.key}:n`} onPress={() => run(`${i.key}:n`, i.no!.run)} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.goldLine, padding: Space.md, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headText: { flex: 1, fontSize: Type.label, fontWeight: '600', color: Corpus.text },
  more: { fontSize: Type.small, color: Corpus.gold, fontWeight: '600' },
  item: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  body: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});

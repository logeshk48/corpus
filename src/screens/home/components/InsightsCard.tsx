import { Button, IconChip } from '@/components/ui';
import { Chip, Corpus, Font, Space, Type } from '@/constants/theme';
import type { Ionicons } from '@expo/vector-icons';
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
const C = { gold: Chip.blue, warn: Chip.orange, danger: Chip.red, good: Chip.green };

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
    <View style={{ gap: 8 }}>
      <View style={st.head}>
        <Text style={st.headText} accessibilityRole="header">For you</Text>
        {items.length > 2 && (
          <Text style={st.more} onPress={() => setAll(!all)}>
            {all ? 'Show less' : `+${items.length - 2} more`}
          </Text>
        )}
      </View>
      {show.map((i) => (
        <View key={i.key} style={st.card}>
          <View style={st.row}>
            <IconChip icon={String(i.icon).replace(/-outline$/, '')} color={C[i.tone]} />
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
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 4 },
  headText: { flex: 1, fontSize: Type.h3, fontFamily: Font.display, fontWeight: '700', color: Corpus.text },
  more: { fontSize: Type.input, color: Corpus.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: Type.input, fontWeight: '600', color: Corpus.text },
  body: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
});

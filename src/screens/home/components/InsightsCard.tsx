import { IconChip } from '@/components/ui';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import type { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

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

// "For you": things Corpus noticed, each with one action and a way to wave it off.
// Two show at first; the rest open in place.
export default function InsightsCard({ items }: { items: Insight[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const reduce = useReducedMotion();
  if (!items.length) return null;
  const show = all ? items : items.slice(0, 2);
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try { await fn(); } finally { setBusy(null); }
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={st.head}>
        <Text style={st.headText} accessibilityRole="header">For you</Text>
        {items.length > 2 && (
          <Pressable onPress={() => setAll(!all)} hitSlop={8} accessibilityRole="button">
            <Text style={st.more}>{all ? 'Show less' : `${items.length - 2} more`}</Text>
          </Pressable>
        )}
      </View>
      {show.map((i) => (
        <Animated.View key={i.key} entering={reduce ? undefined : FadeIn.duration(200)} layout={reduce ? undefined : LinearTransition.duration(220)} style={st.card}>
          <View style={st.row}>
            <IconChip icon={String(i.icon).replace(/-outline$/, '')} color={C[i.tone]} size={38} />
            <Text style={st.title}>{i.title}</Text>
          </View>
          <Text style={st.body}>{i.body}</Text>
          <View style={st.actions}>
            <Pressable onPress={() => run(`${i.key}:y`, i.yes.run)} disabled={!!busy} style={({ pressed }) => [st.pill, st.pillOn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              {busy === `${i.key}:y` ? <ActivityIndicator size="small" color={Corpus.bg} /> : <Text style={[st.pillText, { color: Corpus.bg }]}>{i.yes.label}</Text>}
            </Pressable>
            {i.no && (
              <Pressable onPress={() => run(`${i.key}:n`, i.no!.run)} disabled={!!busy} style={({ pressed }) => [st.pill, st.pillOff, pressed && { opacity: 0.8 }]} accessibilityRole="button">
                {busy === `${i.key}:n` ? <ActivityIndicator size="small" color={Corpus.text} /> : <Text style={st.pillText}>{i.no.label}</Text>}
              </Pressable>
            )}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 4 },
  headText: { flex: 1, fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
  more: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.textMuted },
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: 14, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  body: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19, paddingLeft: 50 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 50 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: Corpus.text },
  pillOff: { borderWidth: 1, borderColor: Corpus.border },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});

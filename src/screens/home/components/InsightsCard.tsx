import { Corpus, Font, Note, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

export type Insight = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'gold' | 'warn' | 'danger' | 'good';
  title: string;
  body: string;
  yes: { label: string; run: () => Promise<void> };
  no?: { label: string; run: () => Promise<void> };
};

// "For you": things Corpus noticed, as a sticky note. One note at a time so Today stays calm;
// "Next" flips to the next one.
export default function InsightsCard({ items }: { items: Insight[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const reduce = useReducedMotion();
  if (!items.length) return null;
  const i = Math.min(at, items.length - 1);
  const n = items[i];
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try { await fn(); } finally { setBusy(null); }
  };
  return (
    <View style={{ gap: 14 }}>
      <Text style={st.head} accessibilityRole="header">For you</Text>
      <Animated.View key={n.key} entering={reduce ? undefined : FadeIn.duration(220)} style={st.note}>
        <View style={st.tape} pointerEvents="none" />
        <View style={st.top}>
          <Text style={st.label}>{items.length > 1 ? `${i + 1} of ${items.length}` : 'Noticed'}</Text>
          {items.length > 1 && (
            <Pressable onPress={() => setAt((i + 1) % items.length)} hitSlop={10} style={st.next} accessibilityRole="button" accessibilityLabel="Next tip">
              <Text style={st.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={14} color={Note.ink} />
            </Pressable>
          )}
        </View>
        <Text style={st.title}>{n.title}</Text>
        <Text style={st.body}>{n.body}</Text>
        <View style={st.actions}>
          <Pressable onPress={() => run(`${n.key}:y`, n.yes.run)} disabled={!!busy} style={({ pressed }) => [st.btn, st.btnOn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            {busy === `${n.key}:y` ? <ActivityIndicator size="small" color={Note.bg} /> : <Text style={[st.btnText, { color: Note.bg }]}>{n.yes.label}</Text>}
          </Pressable>
          {n.no && (
            <Pressable onPress={() => run(`${n.key}:n`, n.no!.run)} disabled={!!busy} style={({ pressed }) => [st.btn, st.btnOff, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              {busy === `${n.key}:n` ? <ActivityIndicator size="small" color={Note.ink} /> : <Text style={st.btnText}>{n.no.label}</Text>}
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  head: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  note: { marginHorizontal: 6, marginTop: 6, backgroundColor: Note.bg, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 6, borderBottomRightRadius: 20, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 16, gap: 8, transform: [{ rotate: '-1.2deg' }] },
  tape: { position: 'absolute', top: -10, left: '50%', width: 80, height: 20, marginLeft: -40, backgroundColor: Note.tape, transform: [{ rotate: '3deg' }] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: Type.small, fontFamily: Font.displayBold, color: Note.label },
  next: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  nextText: { fontSize: Type.body, fontFamily: Font.displayBold, color: Note.ink },
  title: { fontSize: Type.title, lineHeight: 23, fontFamily: Font.displayBold, color: Note.ink },
  body: { fontSize: Type.bodyLg, lineHeight: 20, color: Note.sub },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  btn: { height: 36, paddingHorizontal: 15, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: Note.ink },
  btnOff: { borderWidth: 1.5, borderColor: Note.ink },
  btnText: { fontSize: Type.body, fontFamily: Font.displayBold, color: Note.ink },
});

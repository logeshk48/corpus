import { Button, IconChip } from '@/components/ui';
import { Chip, Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { useBills } from '@/hooks/useBills';
import { useIous } from '@/hooks/useIous';
import { useSafeToday } from '@/hooks/useSafeToday';
import { useTransactions } from '@/hooks/useTransactions';
import { ask, EXAMPLE_GROUPS, type Answer } from '@/utils/ask';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Turn = { id: number; q: string; a: Answer };

function Suggest({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Ask: ${label}`}>
      <Text style={s.chipText}>{label}</Text>
    </Pressable>
  );
}

// Ask Corpus: questions about your own money, answered from your entries on this device.
// Rules, not AI, so every number can be traced back to what you logged.
export default function AskScreen() {
  const router = useRouter();
  const { transactions: tx, loading } = useTransactions('last12Months');
  const { bills } = useBills();
  const { ious } = useIous();
  const safe = useSafeToday();
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [focus, setFocus] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setTurns((t) => [...t, { id: Date.now(), q: question, a: ask(question, { tx, bills, ious, safe }) }].slice(-20));
    setText('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const last = turns[turns.length - 1];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.head}>
          <Text style={[s.title, { flex: 1 }]} accessibilityRole="header">Ask Corpus</Text>
          {turns.length > 0 && (
            <Pressable onPress={() => setTurns([])} hitSlop={8} style={({ pressed }) => [s.headBtn, pressed && { opacity: 0.6 }]} accessibilityRole="button">
              <Text style={s.headText}>Clear</Text>
            </Pressable>
          )}
          <Pressable onPress={close} hitSlop={6} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={Corpus.text} />
          </Pressable>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {turns.length === 0 && (
            <Animated.View entering={FadeInDown.duration(320)} style={{ gap: Space.lg }}>
              <View style={{ gap: 8 }}>
                <IconChip icon="chatbubbles" color={Chip.indigo} size={48} />
                <Text style={s.hello}>Ask about your money</Text>
                <Text style={s.muted}>Answers come from your own entries, worked out on this device. Nothing you ask is sent anywhere.</Text>
              </View>
              {EXAMPLE_GROUPS.map((g) => (
                <View key={g.title} style={{ gap: 10 }}>
                  <View style={s.groupHead}>
                    <Ionicons name={g.icon as keyof typeof Ionicons.glyphMap} size={15} color={Corpus.textMuted} />
                    <Text style={s.groupTitle}>{g.title}</Text>
                  </View>
                  <View style={s.chips}>{g.items.map((e) => <Suggest key={e} label={e} onPress={() => send(e)} disabled={loading} />)}</View>
                </View>
              ))}
            </Animated.View>
          )}

          {turns.map((t) => (
            <Animated.View key={t.id} entering={FadeInDown.duration(280)} style={{ gap: 10 }}>
              <View style={s.q}><Text style={s.qText}>{t.q}</Text></View>
              <View style={s.a}>
                {!!t.a.figure && <Text style={s.figure}>{t.a.figure}</Text>}
                <Text style={t.a.figure ? s.aText : s.aTextBig}>{t.a.text}</Text>
                {t.a.detail?.map((d, j) => <Text key={j} style={s.detail}>{d}</Text>)}
                {!!t.a.rows?.length && (
                  <View style={s.rows}>
                    {t.a.rows.map((r, j) => (
                      <View key={j} style={[s.rowItem, j > 0 && s.rowLine]}>
                        <View style={{ flex: 1, gap: 1 }}>
                          <Text style={s.rowLeft} numberOfLines={1}>{r.left}</Text>
                          {!!r.sub && <Text style={s.rowSub}>{r.sub}</Text>}
                        </View>
                        <Text style={s.rowRight}>{r.right}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {t.a.href && (
                  <View style={{ alignSelf: 'flex-start' }}>
                    <Button variant="secondary" size="sm" label={t.a.hrefLabel ?? 'Open'} icon="arrow-forward" iconRight onPress={() => router.push(t.a.href as Href)} />
                  </View>
                )}
              </View>
              {t === last && !!t.a.next?.length && (
                <View style={{ gap: 8 }}>
                  <Text style={s.small}>Ask next</Text>
                  <View style={s.chips}>{t.a.next.map((n) => <Suggest key={n} label={n} onPress={() => send(n)} />)}</View>
                </View>
              )}
            </Animated.View>
          ))}
        </ScrollView>

        <View style={s.bar}>
          <View style={[s.inputBox, focus && { borderColor: Corpus.text }]}>
            <TextInput
              style={s.input} value={text} onChangeText={setText} placeholder="Ask, for example Swiggy last month" placeholderTextColor={Corpus.textFaint}
              onSubmitEditing={() => send(text)} returnKeyType="send" editable={!loading} accessibilityLabel="Your question"
              onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            />
            <Pressable style={[s.send, !text.trim() && { opacity: 0.35 }]} onPress={() => send(text)} disabled={!text.trim() || loading} accessibilityRole="button" accessibilityLabel="Ask">
              <Ionicons name="arrow-up" size={20} color={Corpus.onGold} />
            </Pressable>
          </View>
          {loading && <Text style={[s.small, { textAlign: 'center' }]}>Loading your entries…</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Space.md, paddingVertical: 8 },
  title: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.4 },
  headBtn: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  headText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: Corpus.card, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Space.md, gap: Space.lg, paddingBottom: Space.lg },
  hello: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.6, marginTop: 6 },
  muted: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
  small: { fontSize: Type.small, color: Corpus.textMuted },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.card },
  chipText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  q: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: Corpus.gold, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 },
  qText: { fontSize: Type.bodyLg, color: Corpus.onGold, fontFamily: Font.display },
  a: { alignSelf: 'stretch', backgroundColor: Corpus.card, borderRadius: 22, borderBottomLeftRadius: 6, padding: 16, gap: 8 },
  figure: { fontSize: Type.amount, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  aText: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, marginTop: -4 },
  aTextBig: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text, lineHeight: 21 },
  detail: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, ...tabular },
  rows: { backgroundColor: Corpus.bg, borderRadius: 14, paddingHorizontal: 12, marginTop: 2 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  rowLeft: { fontSize: Type.body, color: Corpus.text },
  rowSub: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  rowRight: { fontSize: Type.body, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  bar: { paddingHorizontal: Space.md, paddingTop: 8, paddingBottom: Space.sm, gap: 6, backgroundColor: Corpus.bg },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, borderRadius: 28, backgroundColor: Corpus.card, borderWidth: 1.5, borderColor: Corpus.card, paddingLeft: 18, paddingRight: 6 },
  input: { flex: 1, fontSize: Type.input, color: Corpus.text, paddingVertical: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' },
});

import { ScreenHeader } from '@/components/ui';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { useBills } from '@/hooks/useBills';
import { useIous } from '@/hooks/useIous';
import { useSafeToday } from '@/hooks/useSafeToday';
import { useTransactions } from '@/hooks/useTransactions';
import { ask, EXAMPLES, type Answer } from '@/utils/ask';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Turn = { q: string; a: Answer };

// Ask Corpus: questions about your own money, answered from your entries on the phone
export default function AskScreen() {
  const router = useRouter();
  const { transactions: tx, loading } = useTransactions('last12Months');
  const { bills } = useBills();
  const { ious } = useIous();
  const safe = useSafeToday();
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const scroll = useRef<ScrollView>(null);

  const send = (q: string) => {
    const question = q.trim();
    if (!question) return;
    setTurns((t) => [...t, { q: question, a: ask(question, { tx, bills, ious, safe }) }].slice(-20));
    setText('');
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: Space.lg }}>
          <ScreenHeader title="Ask Corpus" icon="chatbubble-ellipses-outline" />
        </View>
        <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {turns.length === 0 && (
            <View style={{ gap: Space.md }}>
              <Text style={s.intro}>Ask about your spending, income, bills or people. Answers come from your own entries, worked out on this phone.</Text>
              <View style={s.chips}>
                {EXAMPLES.map((e) => (
                  <Pressable key={e} style={s.chip} onPress={() => send(e)} disabled={loading} accessibilityRole="button">
                    <Text style={s.chipText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {turns.map((t, i) => (
            <View key={i} style={{ gap: 8 }}>
              <View style={s.q}><Text style={s.qText}>{t.q}</Text></View>
              <View style={s.a}>
                <Text style={s.aText}>{t.a.text}</Text>
                {t.a.detail?.map((d, j) => <Text key={j} style={s.detail}>{d}</Text>)}
                {t.a.href && (
                  <Pressable onPress={() => router.push(t.a.href as Href)} hitSlop={6}>
                    <Text style={s.link}>{t.a.hrefLabel ?? 'Open'} →</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={Corpus.gold} />}
        </ScrollView>
        <View style={s.bar}>
          <TextInput
            style={s.input} value={text} onChangeText={setText} placeholder="e.g. Swiggy last month" placeholderTextColor={Corpus.textFaint}
            onSubmitEditing={() => send(text)} returnKeyType="send" editable={!loading} accessibilityLabel="Your question"
          />
          <Pressable style={[s.send, !text.trim() && { opacity: 0.4 }]} onPress={() => send(text)} disabled={!text.trim() || loading} accessibilityLabel="Ask">
            <Ionicons name="arrow-up" size={18} color={Corpus.onGold} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, gap: Space.md, paddingBottom: Space.lg },
  intro: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.goldLine, backgroundColor: Corpus.goldTint },
  chipText: { fontSize: Type.small, color: Corpus.gold, fontWeight: '500' },
  q: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: Corpus.goldActive, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  qText: { fontSize: Type.body, color: Corpus.text },
  a: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: Corpus.card, borderWidth: 0.5, borderColor: Corpus.border, borderRadius: Radius.md, padding: 12, gap: 4 },
  aText: { fontSize: Type.body, color: Corpus.text, fontWeight: '600', lineHeight: 20 },
  detail: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 18 },
  link: { fontSize: Type.small, color: Corpus.gold, fontWeight: '600', marginTop: 4 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Space.lg, paddingVertical: Space.sm, borderTopWidth: 0.5, borderTopColor: Corpus.border, backgroundColor: Corpus.bg },
  input: { flex: 1, backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Type.body, color: Corpus.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' },
});

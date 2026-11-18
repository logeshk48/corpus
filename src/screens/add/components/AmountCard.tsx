import { DayStepper } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { TxType } from '@/types/transaction';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const yesterday = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1, 12); };

// The heart of Add and Edit: how much, what it was, and when. Amount first and big; the note right under it,
// because typing "Swiggy" lets Corpus pick the category for you; the day as two quick pills (most entries are today or yesterday).
export default function AmountCard({ type, amount, onAmount, note, onNote, day, onDay, autoFocus, notePlaceholder }: {
  type: TxType; amount: string; onAmount: (v: string) => void; note: string; onNote: (v: string) => void;
  day: Date; onDay: (d: Date) => void; autoFocus?: boolean; notePlaceholder?: string;
}) {
  const isToday = sameDay(day, new Date());
  const isYesterday = sameDay(day, yesterday());
  const [other, setOther] = useState(!isToday && !isYesterday);
  useEffect(() => { if (!isToday && !isYesterday) setOther(true); }, [isToday, isYesterday]);
  const [focus, setFocus] = useState(false);
  const income = type === 'income';
  const has = Number(amount) > 0;
  const pill = (label: string, on: boolean, go: () => void) => (
    <Pressable key={label} onPress={go} style={({ pressed }) => [s.pill, on && s.pillOn, pressed && { opacity: 0.75 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[s.pillText, on && { color: Corpus.onGold }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.card}>
      <View style={s.amountRow}>
        <Text style={[s.rupee, has && { color: income ? Corpus.income : Corpus.text }]}>{income ? '+₹' : '₹'}</Text>
        <TextInput
          style={[s.amount, income && { color: Corpus.income }]}
          value={amount}
          onChangeText={(t) => onAmount(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 10))}
          placeholder="0"
          placeholderTextColor={Corpus.textFaint}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          accessibilityLabel="Amount"
        />
      </View>
      <View style={[s.noteBox, focus && { borderColor: Corpus.text }]}>
        <TextInput
          style={s.note}
          value={note}
          onChangeText={onNote}
          placeholder={notePlaceholder ?? (income ? 'Who paid you? e.g. Client payment' : 'What was it? e.g. Swiggy, auto, chai')}
          placeholderTextColor={Corpus.textFaint}
          maxLength={60}
          accessibilityLabel="What was it"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
      </View>
      <View style={s.pills} accessibilityRole="radiogroup">
        {pill('Today', isToday && !other, () => { setOther(false); onDay(new Date()); })}
        {pill('Yesterday', isYesterday && !other, () => { setOther(false); onDay(yesterday()); })}
        {pill('Earlier', other, () => { setOther(true); if (isToday) onDay(yesterday()); })}
      </View>
      {other && <View style={{ alignSelf: 'stretch' }}><DayStepper label="Day" value={day} onChange={onDay} /></View>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 26, paddingTop: 22, paddingBottom: 16, paddingHorizontal: 16, alignItems: 'center', gap: 14 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  rupee: { fontSize: Type.h1 + 6, fontFamily: Font.display, color: Corpus.textFaint, marginRight: 2 },
  amount: {
    fontSize: Type.entry + 12, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.5,
    minWidth: 60, maxWidth: '85%', flexShrink: 1, textAlign: 'center', padding: 0, ...tabular,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  noteBox: { alignSelf: 'stretch', borderRadius: 16, backgroundColor: Corpus.bg, borderWidth: 1.5, borderColor: Corpus.bg, paddingHorizontal: 14 },
  note: { fontSize: Type.input, color: Corpus.text, paddingVertical: 13, textAlign: 'center', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: Corpus.bg, justifyContent: 'center' },
  pillOn: { backgroundColor: Corpus.gold },
  pillText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});

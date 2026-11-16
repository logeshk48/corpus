import { Button, Field, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { IncomeStream } from '@/types/incomeStream';
import { formatINR } from '@/utils/format';
import type { Usual } from '@/utils/incomeUsual';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const DAY = 86_400_000;

// "Got paid": type what came in from this source. Amounts from your own history are one tap away.
export default function GotPaidSheet({ stream, usual, onClose, onSave }: {
  stream: IncomeStream; usual: Usual; onClose: () => void; onSave: (amount: number, date: Date, note?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(stream.fixed && stream.expectedMonthly ? String(stream.expectedMonthly) : '');
  const [daysAgo, setDaysAgo] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const value = Number(amount);
  const ok = Number.isFinite(value) && value > 0;

  const chips: { label: string; v: number }[] = [];
  if (usual.last) chips.push({ label: `Same as last time ${formatINR(usual.last)}`, v: usual.last });
  if (usual.months >= 2 && usual.avg !== usual.last) chips.push({ label: `Your usual ${formatINR(usual.avg)}`, v: usual.avg });
  if (stream.expectedMonthly && !chips.some((c) => c.v === stream.expectedMonthly)) chips.push({ label: formatINR(stream.expectedMonthly), v: stream.expectedMonthly });

  const save = async () => {
    setTried(true);
    if (!ok || busy) return;
    setBusy(true);
    try { await onSave(value, new Date(Date.now() - daysAgo * DAY), note.trim() || undefined); } finally { setBusy(false); }
  };

  return (
    <Sheet
      title={`Paid by ${stream.name}`}
      subtitle={usual.months >= 2 ? `Usually ${formatINR(usual.low)} to ${formatINR(usual.high)} a month` : 'Type the amount that came in'}
      onClose={onClose}
      footer={<Button label={ok ? `Add ${formatINR(value)}` : 'Add income'} tint={Corpus.income} onPress={save} loading={busy} />}
    >
      <View style={s.box}>
        <View style={s.row}>
          <Text style={s.rupee}>₹</Text>
          <TextInput
            style={[s.amount, { width: Math.max(90, (amount.length || 1) * 30 + 16) }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={save}
            accessibilityLabel="Amount received"
          />
        </View>
        {tried && !ok && <Text style={s.error}>Enter the amount you got</Text>}
      </View>
      {chips.length > 0 && (
        <View style={s.chips}>
          {chips.map((c) => (
            <Pressable key={c.label} onPress={() => setAmount(String(c.v))} style={({ pressed }) => [s.chip, value === c.v && s.chipOn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Text style={[s.chipText, value === c.v && { color: Corpus.onGold }]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Text style={s.label}>When</Text>
        <View style={s.chips}>
          {(['Today', 'Yesterday', '2 days ago'] as const).map((l, k) => (
            <Pressable key={l} onPress={() => setDaysAgo(k)} style={({ pressed }) => [s.chip, daysAgo === k && s.chipOn, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: daysAgo === k }}>
              <Text style={[s.chipText, daysAgo === k && { color: Corpus.onGold }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder="October invoice" maxLength={40} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rupee: { fontSize: Type.h1, fontFamily: Font.display, color: Corpus.textMuted, marginRight: 4 },
  amount: { fontSize: Type.entry, fontFamily: Font.displayBold, color: Corpus.text, textAlign: 'center', padding: 0, ...tabular, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  error: { fontSize: Type.small, color: Corpus.danger },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
});

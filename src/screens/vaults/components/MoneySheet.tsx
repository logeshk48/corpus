import { Button, Field, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { savedOf, type VaultEntryType, type VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import JarFill from './JarFill';

type Props = {
  jar: VaultWithBalance | null; // null = closed
  type: VaultEntryType;
  initialAmount?: number;       // e.g. from a smart tip
  onClose: () => void;
  onSubmit: (amount: number, note?: string) => Promise<void>;
};

// Add to / take out of a jar. The jar on the left shows the new level as you type.
export default function MoneySheet({ jar, type, initialAmount, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (jar) { setAmount(initialAmount ? String(initialAmount) : ''); setNote(''); }
  }, [jar, type, initialAmount]);

  if (!jar) return null;
  const isIn = type === 'in';
  const value = Number(amount);
  const entered = amount.trim() !== '';
  const notNumber = entered && (!Number.isFinite(value) || value <= 0);
  const tooMuch = !isIn && entered && !notNumber && value > jar.balance;
  const ok = entered && !notNumber && !tooMuch;
  const newBalance = jar.balance + (ok ? (isIn ? value : -value) : 0);
  const newSaved = newBalance + (jar.invested ?? 0);
  const level = jar.goal ? newSaved / jar.goal : newSaved > 0 ? 0.6 : 0;

  const chips: { label: string; value: number }[] = [];
  if (isIn && jar.goal && jar.goal > savedOf(jar)) chips.push({ label: `Fill it: ${formatINR(jar.goal - savedOf(jar))}`, value: jar.goal - savedOf(jar) });
  for (const v of [500, 1000, 2000, 5000]) if (isIn || v < jar.balance) chips.push({ label: formatINR(v), value: v });
  if (!isIn && jar.balance > 0) chips.push({ label: `All ${formatINR(jar.balance)}`, value: jar.balance });

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try { await onSubmit(value, note.trim() || undefined); } finally { setBusy(false); }
  };

  return (
    <Sheet
      title={isIn ? `Add to ${jar.name}` : `Take out of ${jar.name}`}
      subtitle={`${formatINR(jar.balance)} cash in it${jar.invested ? `, ${formatINR(jar.invested)} invested` : ''}${jar.goal ? `. Goal ${formatINR(jar.goal)}` : ''}`}
      onClose={onClose}
      footer={<Button label={`${isIn ? 'Add' : 'Take out'} ${ok ? formatINR(value) : 'money'}`} tint={isIn ? jar.color : undefined} tintText="black" onPress={submit} loading={busy} disabled={!ok} />}
    >
      <View style={s.top}>
        <JarFill level={level} color={jar.color} width={64} height={84} marks={!!jar.goal} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={s.amountRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={[s.amount, { color: isIn ? jar.color : Corpus.text }]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="decimal-pad"
              autoFocus
              onSubmitEditing={submit}
              accessibilityLabel={isIn ? 'Amount to add' : 'Amount to take out'}
            />
          </View>
          {notNumber ? <Text style={s.error}>Enter an amount above ₹0</Text>
            : tooMuch ? <Text style={s.error}>Only {formatINR(jar.balance)} cash in this jar{jar.invested ? '. Sell investments in Invest' : ''}</Text>
            : <Text style={s.after}>{ok ? `Then ${formatINR(newBalance)} cash${jar.goal ? `, ${Math.min(100, Math.round((newSaved / jar.goal) * 100))}% of the goal` : ''}` : ' '}</Text>}
        </View>
      </View>
      <View style={s.chips}>
        {chips.map((c) => (
          <Pressable key={c.label} style={({ pressed }) => [s.chip, value === c.value && s.chipOn, pressed && { opacity: 0.7 }]} onPress={() => setAmount(String(c.value))} accessibilityRole="button">
            <Text style={[s.chipText, value === c.value && { color: Corpus.onGold }]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder={isIn ? 'From the Zenith payment' : 'Paid advance tax'} maxLength={60} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  rupee: { fontSize: Type.h1, fontFamily: Font.display, color: Corpus.textMuted, marginRight: 4 },
  amount: { flex: 1, minWidth: 0, width: '100%', fontSize: Type.entry, fontFamily: Font.displayBold, padding: 0, ...tabular, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  after: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  error: { fontSize: Type.body, color: Corpus.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
});

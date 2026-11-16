import { Button, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  bill: Bill | null; // null = closed
  onClose: () => void;
  onPay: (bill: Bill, amount: number) => Promise<void>;
  onSkip: (bill: Bill) => Promise<void>;
};

// Record this month's payment of a bill (or skip it)
export default function PayBillSheet({ bill, onClose, onPay, onSkip }: Props) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (bill) { setAmount(bill.variable ? '' : String(bill.amount)); setTried(false); }
  }, [bill]);

  if (!bill) return null;
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0;
  const month = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <Sheet
      title={`${bill.name} for ${month}`}
      subtitle={bill.variable ? `How much was it this time? Usually about ${formatINR(bill.amount)}` : 'Record this payment'}
      onClose={onClose}
      footer={
        <>
          <Button label={valid ? `Mark ${formatINR(value)} paid` : 'Mark paid'} icon="checkmark" onPress={() => { setTried(true); if (valid) run(() => onPay(bill, value)); }} loading={busy} />
          <Button variant="quiet" label="Skip this month" onPress={() => run(() => onSkip(bill))} disabled={busy} />
        </>
      }
    >
      <View style={s.box}>
        <View style={s.row}>
          <Text style={s.rupee}>₹</Text>
          <TextInput
            style={[s.amount, { width: Math.max(90, (amount.length || 1) * 30 + 16) }]}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
            placeholder={String(bill.amount)}
            placeholderTextColor={Corpus.textFaint}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            accessibilityLabel="Amount paid"
          />
        </View>
        {tried && !valid && <Text style={s.error}>Enter the amount you paid</Text>}
      </View>
      {bill.variable && (
        <Pressable style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]} onPress={() => setAmount(String(bill.amount))} accessibilityRole="button">
          <Text style={s.chipText}>Same as usual {formatINR(bill.amount)}</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rupee: { fontSize: Type.h1, fontFamily: Font.display, color: Corpus.textMuted, marginRight: 4 },
  amount: { fontSize: Type.entry, fontFamily: Font.displayBold, color: Corpus.text, textAlign: 'center', padding: 0, ...tabular, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  error: { fontSize: Type.small, color: Corpus.danger },
  chip: { alignSelf: 'center', minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
});

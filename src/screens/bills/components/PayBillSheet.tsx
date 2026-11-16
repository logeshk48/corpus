import DateStepper from '@/components/DateStepper';
import { Button, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { isDayPlan, nextDue } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  bill: Bill | null; // null = closed
  onClose: () => void;
  onPay: (bill: Bill, amount: number, paidOn: Date) => Promise<void>;
  onSkip: (bill: Bill) => Promise<void>;
};

// Record the waiting payment of a bill (or skip it)
export default function PayBillSheet({ bill, onClose, onPay, onSkip }: Props) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [paidOn, setPaidOn] = useState(new Date());

  useEffect(() => {
    if (bill) { setAmount(bill.variable ? '' : String(bill.amount)); setTried(false); setPaidOn(new Date()); }
  }, [bill]);

  if (!bill) return null;
  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0;
  const due = nextDue(bill);
  const dueOn = due.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const title = isDayPlan(bill) ? bill.name : `${bill.name} for ${due.date.toLocaleDateString('en-IN', { month: 'long' })}`;
  const when = due.daysAway < 0 ? `Was due ${dueOn}` : due.daysAway === 0 ? 'Due today' : `Due ${dueOn}`;
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <Sheet
      title={title}
      subtitle={bill.variable ? `${when}. Usually about ${formatINR(bill.amount)}` : when}
      onClose={onClose}
      footer={
        <>
          <Button label={valid ? `Mark ${formatINR(value)} paid` : 'Mark paid'} icon="checkmark" onPress={() => { setTried(true); if (valid) run(() => onPay(bill, value, paidOn)); }} loading={busy} />
          <Button variant="quiet" label="Skip this one" onPress={() => run(() => onSkip(bill))} disabled={busy} />
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
      <View style={s.when}>
        <Text style={s.whenLabel}>Paid on</Text>
        <DateStepper value={paidOn} onChange={setPaidOn} />
        {isDayPlan(bill) && <Text style={s.whenHint}>The next {bill.everyDays} days are counted from this day, or from the due date if you paid early.</Text>}
      </View>
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
  when: { gap: 6 },
  whenLabel: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  whenHint: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  chipText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
});

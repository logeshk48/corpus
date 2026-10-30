import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { Investment, Sip } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { futureValue } from '@/utils/returns';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { m } from './Market.styles';

const DAYS = [1, 5, 7, 10, 15, 20, 25, 28];
const STEPS = [0, 5, 10, 15];

// Set up / change / stop the monthly SIP on a holding
export default function SipSheet({ h, onSave, onClose }: { h: Investment; onSave: (sip: Sip | null) => Promise<void>; onClose: () => void }) {
  const cur = h.sip;
  const [amount, setAmount] = useState(cur ? String(cur.amount) : '');
  const [day, setDay] = useState(cur?.day ?? 5);
  const [step, setStep] = useState(cur?.stepUpPct ?? 0);
  const [busy, setBusy] = useState(false);
  const amt = Number(amount);
  const fv10 = amt > 0 ? futureValue(0, amt, 12, 120) : 0;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name="repeat" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{cur ? 'Your SIP' : 'Start tracking a SIP'}</Text>
              <Text style={sheet.subtitle} numberOfLines={1}>{h.name}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput style={sheet.amountInput} value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ''))} placeholder="0" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" autoFocus={!cur} />
            </View>
            <Text style={[sheet.hint, { textAlign: 'center' }]}>every month</Text>
            <View style={{ gap: 6 }}>
              <Text style={f.label}>DEBIT DATE</Text>
              <View style={sheet.chips}>
                {DAYS.map((d) => (
                  <Pressable key={d} style={[sheet.chip, day === d && sheet.chipSuggested]} onPress={() => setDay(d)}>
                    <Text style={[sheet.chipText, day === d && sheet.chipTextSuggested]}>{d === 1 ? '1st' : `${d}th`}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={m.tiny}>The date your bank auto-debits it. Check your fund app or bank mandate.</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={f.label}>YEARLY STEP-UP</Text>
              <View style={sheet.chips}>
                {STEPS.map((s) => (
                  <Pressable key={s} style={[sheet.chip, step === s && sheet.chipSuggested]} onPress={() => setStep(s)}>
                    <Text style={[sheet.chipText, step === s && sheet.chipTextSuggested]}>{s ? `+${s}% a year` : 'None'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {amt > 0 && (
              <Text style={m.small}>
                At ~12% a year, {formatINR(amt)} a month becomes about <Text style={{ color: Corpus.income, fontWeight: '600' }}>{formatINR(Math.round(fv10))}</Text> in 10 years
                ({formatINR(amt * 120)} put in).
              </Text>
            )}
            <Text style={m.tiny}>
              Each month on the debit date Corpus asks “did it go through?”. Tap yes and it adds the units at that day’s NAV. If you don’t answer in {5} days it assumes yes. Only SIPs from now on are tracked; your current units already include past ones.
            </Text>
            <Button
              label={cur ? 'Save SIP' : 'Start tracking'}
              loading={busy}
              disabled={!(amt > 0)}
              onPress={() =>
                run(() =>
                  onSave({
                    amount: amt,
                    day,
                    stepUpPct: step || undefined,
                    active: true,
                    // keep the original start when editing; new SIPs count from today
                    start: cur?.start ?? new Date().toISOString(),
                  })
                )
              }
            />
            {cur && (
              cur.active ? (
                <Button variant="danger" icon="pause" label="Stop this SIP" onPress={() => run(() => onSave({ ...cur, active: false }))} />
              ) : (
                <Text style={[m.small, { textAlign: 'center' }]}>This SIP is stopped. Save to restart it.</Text>
              )
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

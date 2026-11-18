import { Button, Choice, Field, Segmented, Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { canAfford, type AffordInput, type AffordVerdict } from '@/utils/afford';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  safe: SafeToSpendResult;
  have: number | null;
  cardDues: number;
  billsNext30: number;
  flow: { income: number; spend: number };
  onStartJar: (name: string, goal: number, targetDate: string) => Promise<void>;
};

const MONTHS = ['3', '6', '9', '12', '18', '24'];
// Each answer has its own word, icon and colour together
const TONE: Record<AffordVerdict, { color: string; bg: string; icon: string }> = {
  yes: { color: Corpus.income, bg: Corpus.incomeTint, icon: 'checkmark-circle' },
  tight: { color: Corpus.warning, bg: Corpus.warningTint, icon: 'alert-circle' },
  savings: { color: Corpus.warning, bg: Corpus.warningTint, icon: 'wallet' },
  wait: { color: Corpus.danger, bg: Corpus.dangerTint, icon: 'time' },
  noData: { color: Corpus.textMuted, bg: Corpus.cardAlt, icon: 'help-circle' },
};

// "Can I afford this?": a straight answer from your own numbers, worked out as you type
export default function AffordSheet({ visible, onClose, safe, have, cardDues, billsNext30, flow, onStartJar }: Props) {
  const [price, setPrice] = useState('');
  const [what, setWhat] = useState('');
  const [mode, setMode] = useState<AffordInput['mode']>('now');
  const [months, setMonths] = useState('6');
  const [rate, setRate] = useState('0');
  const [jarDone, setJarDone] = useState(false);
  if (!visible) return null;

  const amount = Number(price) || 0;
  const res = amount > 0 ? canAfford({ price: amount, mode, emiMonths: Number(months), emiRate: Number(rate) || 0, safe, have, cardDues, billsNext30, flow }) : null;
  const tone = res ? TONE[res.verdict] : null;
  const close = () => { setPrice(''); setWhat(''); setMode('now'); setJarDone(false); onClose(); };
  // A pause before a big unplanned buy: a day from ₹5,000, a week from ₹25,000
  const pause = amount >= 25000 ? 'a week' : amount >= 5000 ? 'a day' : null;

  return (
    <Sheet title="Can I afford it?" subtitle="A straight answer from your own numbers" onClose={close}
      footer={res?.verdict === 'wait' && res.readyBy && res.savePerMonth ? (
        <Button icon={jarDone ? 'checkmark' : 'file-tray-stacked'} label={jarDone ? 'Jar made. Find it in Jars' : `Save for it: ${formatINR(res.savePerMonth)} a month`} disabled={jarDone}
          onPress={() => onStartJar(what.trim() || 'Big buy', amount, res.readyBy!).then(() => setJarDone(true)).catch(() => {})} />
      ) : undefined}>
      <Field label="Price" money value={price} onChangeText={(t) => { setPrice(t.replace(/\D/g, '').slice(0, 9)); setJarDone(false); }} placeholder="0" keyboardType="number-pad" autoFocus />
      <Field label="What is it? (optional)" value={what} onChangeText={setWhat} placeholder="New phone, trip, bike" maxLength={30} />
      <Segmented options={[{ value: 'now', label: 'Pay in full' }, { value: 'emi', label: 'On EMI' }]} value={mode} onChange={setMode} />
      {mode === 'emi' && (
        <>
          <Choice label="Months" options={MONTHS.map((m) => ({ value: m, label: m }))} value={months} onChange={setMonths} />
          <Field label="Interest, % a year" value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, '').slice(0, 5))} placeholder="0" keyboardType="decimal-pad" hint="0 for a no-cost EMI" />
        </>
      )}

      {res && tone ? (
        <Animated.View key={`${res.verdict}-${mode}`} entering={FadeIn.duration(200)} style={s.result} accessibilityLiveRegion="polite">
          <View style={[s.verdict, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon as keyof typeof Ionicons.glyphMap} size={20} color={tone.color} />
            <Text style={[s.verdictText, { color: tone.color }]}>{res.title}</Text>
          </View>
          {res.emi != null && <Text style={s.big}>{formatINR(Math.round(res.emi))}<Text style={s.unit}> a month</Text></Text>}
          {res.afterDaily != null && <Text style={s.big}>{formatINR(res.afterDaily)}<Text style={s.unit}> a day left after</Text></Text>}
          {res.lines.map((l, i) => (
            <View key={i} style={s.lineRow}>
              <View style={s.bullet} />
              <Text style={[s.line, { flex: 1 }]}>{l}</Text>
            </View>
          ))}
          {res.daysOfIncome != null && res.daysOfIncome >= 2 && (
            <View style={s.feel}>
              <Ionicons name="hourglass" size={16} color={Corpus.text} />
              <Text style={[s.line, { flex: 1 }]}>{what.trim() ? `${what.trim()} costs` : 'That is'} about <Text style={s.strong}>{res.daysOfIncome} days</Text> of your usual income.</Text>
            </View>
          )}
          {pause && res.verdict !== 'yes' && (
            <View style={s.feel}>
              <Ionicons name="moon" size={16} color={Corpus.text} />
              <Text style={[s.line, { flex: 1 }]}>Not urgent? Wait {pause} before buying. If you still want it then, it was worth it.</Text>
            </View>
          )}
        </Animated.View>
      ) : (
        <Text style={s.small}>Corpus checks what is left this month, your bills and card dues, and keeps 3 months of spending as a safety net.</Text>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  result: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 16, gap: 10 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  verdictText: { fontSize: Type.label, fontFamily: Font.displayBold },
  big: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.6, ...tabular },
  unit: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.textMuted },
  lineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Corpus.textMuted, marginTop: 7 },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  strong: { fontFamily: Font.displayBold },
  feel: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
});

import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { canAfford, type AffordInput, type AffordVerdict } from '@/utils/afford';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

const MONTHS = [3, 6, 9, 12, 18, 24];
const TONE: Record<AffordVerdict, { color: string; bg: string; icon: string }> = {
  yes: { color: Corpus.income, bg: Corpus.incomeTint, icon: 'checkmark-circle' },
  tight: { color: Corpus.warning, bg: Corpus.warningTint, icon: 'alert-circle' },
  savings: { color: Corpus.warning, bg: Corpus.warningTint, icon: 'wallet' },
  wait: { color: Corpus.danger, bg: Corpus.dangerTint, icon: 'time' },
  noData: { color: Corpus.textMuted, bg: Corpus.cardAlt, icon: 'help-circle' },
};

export default function AffordSheet({ visible, onClose, safe, have, cardDues, billsNext30, flow, onStartJar }: Props) {
  const [price, setPrice] = useState('');
  const [what, setWhat] = useState('');
  const [mode, setMode] = useState<AffordInput['mode']>('now');
  const [months, setMonths] = useState(6);
  const [rate, setRate] = useState('0');
  const [jarDone, setJarDone] = useState(false);
  if (!visible) return null;

  const amount = Number(price) || 0;
  const res = amount > 0 ? canAfford({ price: amount, mode, emiMonths: months, emiRate: Number(rate) || 0, safe, have, cardDues, billsNext30, flow }) : null;
  const tone = res ? TONE[res.verdict] : null;
  const close = () => { setPrice(''); setWhat(''); setMode('now'); setJarDone(false); onClose(); };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={close} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={sheet.iconCircle}>
              <Ionicons name="cart-outline" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>Can I afford this?</Text>
              <Text style={sheet.subtitle}>A straight answer from your own numbers</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={close} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput
                style={sheet.amountInput} value={price} onChangeText={(t) => { setPrice(t.replace(/\D/g, '').slice(0, 9)); setJarDone(false); }}
                placeholder="Price" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" autoFocus accessibilityLabel="Price"
              />
            </View>
            <View style={f.field}>
              <Text style={f.label}>WHAT IS IT? (OPTIONAL)</Text>
              <TextInput style={f.input} value={what} onChangeText={setWhat} placeholder="e.g. New phone" placeholderTextColor={Corpus.textFaint} maxLength={30} />
            </View>

            <View style={f.toggle}>
              {(['now', 'emi'] as const).map((m) => (
                <Pressable key={m} style={[f.toggleBtn, mode === m && f.toggleOn]} onPress={() => setMode(m)}>
                  <Text style={[f.toggleText, mode === m && f.toggleTextOn]}>{m === 'now' ? 'Pay in full' : 'On EMI'}</Text>
                </Pressable>
              ))}
            </View>

            {mode === 'emi' && (
              <>
                <View style={f.field}>
                  <Text style={f.label}>MONTHS</Text>
                  <View style={sheet.chips}>
                    {MONTHS.map((m) => (
                      <Pressable key={m} style={[sheet.chip, months === m && sheet.chipSuggested]} onPress={() => setMonths(m)}>
                        <Text style={[sheet.chipText, months === m && sheet.chipTextSuggested]}>{m}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={f.field}>
                  <Text style={f.label}>INTEREST % A YEAR (0 = NO-COST EMI)</Text>
                  <TextInput style={f.input} value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, '').slice(0, 5))} placeholder="0" placeholderTextColor={Corpus.textFaint} keyboardType="decimal-pad" />
                </View>
              </>
            )}

            {res && tone && (
              <View style={[s.result, { backgroundColor: tone.bg }]} accessibilityLiveRegion="polite">
                <View style={s.head}>
                  <Ionicons name={tone.icon as keyof typeof Ionicons.glyphMap} size={20} color={tone.color} />
                  <Text style={[s.title, { color: tone.color }]}>{res.title}</Text>
                </View>
                {res.emi != null && <Text style={s.big}>{formatINR(Math.round(res.emi))}<Text style={s.unit}> / month</Text></Text>}
                {res.afterDaily != null && <Text style={s.big}>{formatINR(res.afterDaily)}<Text style={s.unit}> / day left after</Text></Text>}
                {res.lines.map((l, i) => <Text key={i} style={s.line}>{l}</Text>)}
                {res.verdict === 'wait' && res.readyBy && res.savePerMonth && (
                  <Pressable
                    style={[s.btn, jarDone && { opacity: 0.6 }]} disabled={jarDone}
                    onPress={() => onStartJar(what.trim() || 'Big buy', amount, res.readyBy!).then(() => setJarDone(true)).catch(() => {})}
                    accessibilityRole="button"
                  >
                    <Ionicons name={jarDone ? 'checkmark' : 'file-tray-stacked-outline'} size={16} color={Corpus.onGold} />
                    <Text style={s.btnText}>{jarDone ? 'Jar made — find it in Jars' : `Start a jar: ${formatINR(res.savePerMonth)} a month`}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {!res && <Text style={sheet.hint}>Corpus checks this month’s money, your bills and card dues, and keeps 3 months of spending as a safety net.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  result: { borderRadius: Radius.md, padding: Space.md, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: Type.bodyLg, fontWeight: '700' },
  big: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  unit: { fontSize: Type.small, fontWeight: '500', color: Corpus.textMuted },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 20 },
  btn: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Corpus.gold, borderRadius: Radius.md, paddingVertical: 12 },
  btnText: { fontSize: Type.body, fontWeight: '600', color: Corpus.onGold },
});

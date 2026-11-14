import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { parseMoneyText, type ParsedMoney } from '@/utils/receipt';
import { canScan, scanReceipt } from '@/services/scan';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = { visible: boolean; onClose: () => void; history: Transaction[]; onFill: (p: ParsedMoney) => void };

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function PasteSheet({ visible, onClose, history, onFill }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  if (!visible) return null;
  const scan = async (from: 'camera' | 'library') => {
    setBusy(true); setMsg('');
    try {
      const r = await scanReceipt(from);
      if (r.ok) setText(r.text);
      else if (r.reason === 'denied') setMsg(from === 'camera' ? 'Camera permission is off — allow it in your phone settings.' : 'Photo permission is off — allow it in your phone settings.');
      else if (r.reason === 'empty') setMsg('No text found. Try again in good light, with the whole receipt flat in the frame.');
    } catch {
      setMsg('Couldn’t read that photo. Try again, or paste the text instead.');
    } finally {
      setBusy(false);
    }
  };
  const p = parseMoneyText(text);
  const dup = p?.amount ? history.find((t) => t.type === p.type && t.amount === p.amount && sameDay(new Date(t.date), p.date ?? new Date())) : undefined;
  const close = () => { setText(''); setMsg(''); onClose(); };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={close} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={sheet.iconCircle}>
              <Ionicons name="clipboard-outline" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{canScan ? 'Scan or paste a receipt' : 'Paste an SMS or receipt'}</Text>
              <Text style={sheet.subtitle}>Read on your phone — nothing is sent anywhere</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={close} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            {canScan ? (
              <View style={s.row}>
                {(['camera', 'library'] as const).map((k) => (
                  <Pressable key={k} style={s.scanBtn} onPress={() => scan(k)} disabled={busy} accessibilityRole="button">
                    <Ionicons name={k === 'camera' ? 'camera-outline' : 'image-outline'} size={18} color={Corpus.gold} />
                    <Text style={s.scanText}>{k === 'camera' ? 'Take photo' : 'Pick photo'}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={sheet.hint}>Receipt photos can be scanned in the Corpus phone app. Here, paste the text.</Text>
            )}
            {busy && <ActivityIndicator color={Corpus.gold} />}
            {!!msg && <Text style={[sheet.hint, { color: Corpus.warning }]}>{msg}</Text>}
            <TextInput
              style={[f.input, s.box]} value={text} onChangeText={setText} multiline autoFocus textAlignVertical="top"
              placeholder={'e.g. Rs.450.00 debited from A/c XX1234 on 13-11-26 to VPA swiggy@icici…\n\nLong-press here and tap Paste.'}
              placeholderTextColor={Corpus.textFaint} accessibilityLabel="SMS or receipt text"
            />
            {text.trim().length > 0 && !p && (
              <Text style={sheet.hint}>Couldn’t find an amount in this. Paste the full bank SMS, or the receipt text including the TOTAL line.</Text>
            )}
            {p && (
              <View style={s.card}>
                <Text style={s.label}>{p.kind === 'sms' ? 'BANK SMS' : 'RECEIPT'} · {p.type === 'income' ? 'MONEY IN' : 'MONEY OUT'}</Text>
                <Text style={[s.amount, p.type === 'income' && { color: Corpus.income }]}>{formatINR(p.amount ?? 0)}</Text>
                <Text style={s.line}>
                  {[p.merchant, p.date?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), p.last4 && `A/c ··${p.last4}`].filter(Boolean).join('  ·  ') || 'No name or date found'}
                </Text>
                {!p.sure && <Text style={[s.line, { color: Corpus.warning }]}>Only the amount was clear — check the rest before saving.</Text>}
                {dup && (
                  <Text style={[s.line, { color: Corpus.warning }]}>
                    You already logged {formatINR(dup.amount)}{dup.note ? ` (${dup.note})` : ''} that day. Is this the same one?
                  </Text>
                )}
                <Pressable style={s.btn} onPress={() => { onFill(p); close(); }} accessibilityRole="button">
                  <Text style={s.btnText}>Fill in the form</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  scanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Corpus.goldLine, backgroundColor: Corpus.goldTint },
  scanText: { fontSize: Type.body, fontWeight: '600', color: Corpus.gold },
  box: { minHeight: 120, fontSize: Type.body },
  card: { backgroundColor: Corpus.cardAlt, borderRadius: Radius.md, padding: Space.md, gap: 6 },
  label: { fontSize: Type.caption, color: Corpus.textFaint, letterSpacing: 0.4 },
  amount: { fontSize: Type.title, fontWeight: '700', color: Corpus.text },
  line: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 20 },
  btn: { marginTop: 6, backgroundColor: Corpus.gold, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontSize: Type.body, fontWeight: '600', color: Corpus.onGold },
});

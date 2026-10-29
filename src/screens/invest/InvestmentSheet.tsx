import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { INVEST_TYPES, investMeta, type InvestType, type Investment, type NewInvestment } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { currentValue } from '@/utils/investments';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export type InvSheetMode = { kind: 'new' } | { kind: 'edit'; h: Investment } | { kind: 'add'; h: Investment } | { kind: 'value'; h: Investment };

type Props = {
  mode: InvSheetMode;
  onClose: () => void;
  onSave: (h: NewInvestment) => Promise<void>;
  onAddMoney: (h: Investment, amount: number) => Promise<void>;
  onUpdateValue: (h: Investment, value: number) => Promise<void>;
  onDelete?: () => void;
};
const num = (t: string) => t.replace(/[^0-9.]/g, '');
const yearToIso = (y: string) => (y.length === 4 ? new Date(Number(y), 0, 1).toISOString() : undefined);

export default function InvestmentSheet({ mode, onClose, onSave, onAddMoney, onUpdateValue, onDelete }: Props) {
  const h = mode.kind === 'new' ? undefined : mode.h;
  const [type, setType] = useState<InvestType>(h?.type ?? 'mf');
  const meta = investMeta(type);
  const [name, setName] = useState(h?.name ?? '');
  const [invested, setInvested] = useState(h ? String(h.invested) : '');
  const [value, setValue] = useState(h ? String(mode.kind === 'value' ? currentValue(h).value : h.value) : '');
  const [rate, setRate] = useState(h?.rate ? String(h.rate) : meta.grows ? String(meta.grows) : '');
  const [since, setSince] = useState(h ? String(new Date(h.startDate).getFullYear()) : String(new Date().getFullYear()));
  const [matYear, setMatYear] = useState(h?.maturityDate ? String(new Date(h.maturityDate).getFullYear()) : '');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const isFd = type === 'fd';
  const isAccrual = type === 'epf' || type === 'ppf';
  const pickType = (t: InvestType) => {
    setType(t);
    const g = investMeta(t).grows;
    setRate(g ? String(g) : '');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  // quick actions on an existing holding
  if (mode.kind === 'add' || mode.kind === 'value') {
    const cur = currentValue(mode.h).value;
    const n = Number(amount || value);
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={sheet.overlay}>
          <Pressable style={sheet.backdrop} onPress={onClose} />
          <View style={sheet.sheet}>
            <View style={sheet.handle} />
            <View style={sheet.header}>
              <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
                <Ionicons name={(mode.kind === 'add' ? 'add-circle-outline' : 'refresh') as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
              </View>
              <View style={sheet.titleBlock}>
                <Text style={sheet.title}>{mode.kind === 'add' ? `Put more into ${mode.h.name}` : `What is ${mode.h.name} worth today?`}</Text>
                <Text style={sheet.subtitle}>
                  {mode.kind === 'add' ? 'New money you invested (an SIP, a top-up). Not counted as a gain' : `Check your app or statement. Now ${formatINR(cur)}`}
                </Text>
              </View>
              <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={18} color={Corpus.textMuted} />
              </Pressable>
            </View>
            <View style={sheet.amountRow}>
              <Text style={sheet.rupee}>₹</Text>
              <TextInput
                style={sheet.amountInput}
                value={mode.kind === 'add' ? amount : value}
                onChangeText={(t) => (mode.kind === 'add' ? setAmount(num(t)) : setValue(num(t)))}
                placeholder="0"
                placeholderTextColor={Corpus.textFaint}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
            </View>
            {mode.kind === 'value' && n > 0 && (
              <Text style={[sheet.hint, { color: n >= mode.h.invested ? Corpus.income : Corpus.danger }]}>
                {n >= mode.h.invested ? 'Gain' : 'Loss'} of {formatINR(Math.abs(n - mode.h.invested))} on {formatINR(mode.h.invested)} invested
              </Text>
            )}
            <Button
              label={mode.kind === 'add' ? `Add ${n > 0 ? formatINR(n) : ''}` : 'Save today’s value'}
              onPress={() => run(() => (mode.kind === 'add' ? onAddMoney(mode.h, n) : onUpdateValue(mode.h, n)))}
              loading={busy}
              disabled={!(n > 0)}
            />
          </View>
        </View>
      </Modal>
    );
  }

  const inv = Number(invested);
  const val = isFd ? inv : Number(value || invested);
  const valid = name.trim().length > 0 && inv > 0 && val > 0 && (!isFd || Number(rate) > 0) && since.length === 4;

  const save = () =>
    run(async () => {
      const now = new Date().toISOString();
      await onSave({
        name: name.trim(),
        type,
        invested: inv,
        value: val,
        valueAt: isFd ? yearToIso(since)! : h && Number(value) === h.value ? h.valueAt : now,
        startDate: yearToIso(since)!,
        rate: Number(rate) > 0 && (isFd || isAccrual) ? Number(rate) : undefined,
        maturityDate: isFd ? yearToIso(matYear) : undefined,
      });
    });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>{h ? `Edit ${h.name}` : 'Add an investment'}</Text>
              <Text style={sheet.subtitle}>{meta.hint}</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            {!h && (
              <View style={sheet.chips}>
                {INVEST_TYPES.map((t) => (
                  <Pressable key={t.id} style={[sheet.chip, type === t.id && sheet.chipSuggested]} onPress={() => pickType(t.id)}>
                    <Text style={[sheet.chipText, type === t.id && sheet.chipTextSuggested]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={f.field}>
              <Text style={f.label}>NAME</Text>
              <TextInput style={f.input} value={name} onChangeText={setName} placeholder={type === 'mf' ? 'e.g. Parag Parikh Flexi Cap' : type === 'fd' ? 'e.g. SBI FD' : type === 'epf' ? 'e.g. My EPF' : 'Name'} placeholderTextColor={Corpus.textFaint} maxLength={40} />
            </View>
            <View style={f.field}>
              <Text style={f.label}>{isFd ? 'AMOUNT DEPOSITED' : isAccrual ? 'TOTAL YOU (AND YOUR EMPLOYER) PUT IN' : 'TOTAL YOU INVESTED'}</Text>
              <TextInput style={f.input} value={invested} onChangeText={(t) => setInvested(num(t))} placeholder="₹" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
            </View>
            {!isFd && (
              <View style={f.field}>
                <Text style={f.label}>{isAccrual ? 'BALANCE TODAY (FROM PASSBOOK)' : 'WORTH TODAY'}</Text>
                <TextInput style={f.input} value={value} onChangeText={(t) => setValue(num(t))} placeholder={isAccrual ? 'Your passbook balance' : 'Check your app (Groww, Zerodha, Kuvera…)'} placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
              </View>
            )}
            {(isFd || isAccrual) && (
              <View style={f.field}>
                <Text style={f.label}>INTEREST RATE (% A YEAR)</Text>
                <TextInput style={f.input} value={rate} onChangeText={(t) => setRate(num(t))} placeholder="e.g. 7" placeholderTextColor={Corpus.textFaint} keyboardType="numeric" />
                <Text style={sheet.hint}>{isFd ? 'Value grows on its own (compounded quarterly).' : `Value grows on its own between passbook updates. ${type === 'epf' ? 'EPF: 8.25% for FY 2025-26.' : 'PPF rate is set every quarter by the government.'}`}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[f.field, { flex: 1 }]}>
                <Text style={f.label}>{isFd ? 'OPENED IN' : 'STARTED IN'}</Text>
                <TextInput style={f.input} value={since} onChangeText={(t) => setSince(t.replace(/\D/g, '').slice(0, 4))} placeholder="Year" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
              </View>
              {isFd && (
                <View style={[f.field, { flex: 1 }]}>
                  <Text style={f.label}>MATURES IN</Text>
                  <TextInput style={f.input} value={matYear} onChangeText={(t) => setMatYear(t.replace(/\D/g, '').slice(0, 4))} placeholder="Year" placeholderTextColor={Corpus.textFaint} keyboardType="number-pad" />
                </View>
              )}
            </View>
            <Button label={h ? 'Save changes' : 'Add investment'} onPress={save} loading={busy} disabled={!valid} />
            {h && onDelete && <Button variant="danger" icon="trash-outline" label="Delete" onPress={onDelete} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

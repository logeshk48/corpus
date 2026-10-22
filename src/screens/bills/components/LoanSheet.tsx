import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import type { Bill, Loan, LoanType } from '@/types/bill';
import { yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { buildSchedule, calcEmi } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { styles } from './BillSheet.styles';

const TYPES: { id: LoanType; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'car', label: 'Car', icon: 'car' },
  { id: 'bike', label: 'Bike', icon: 'bicycle' },
  { id: 'personal', label: 'Personal', icon: 'person' },
  { id: 'education', label: 'Education', icon: 'school' },
  { id: 'gadget', label: 'Gadget', icon: 'phone-portrait' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];
const TENURES = [12, 24, 36, 60, 120, 180, 240];

const shiftYm = (ym: string, n: number) =>
  yearMonth(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1 + n, 1));
const ymLabel = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const tenureLabel = (m: number) => {
  const y = Math.floor(m / 12);
  const r = m % 12;
  const years = y > 0 ? `${y} year${y === 1 ? '' : 's'}` : '';
  const months = r > 0 ? `${r} month${r === 1 ? '' : 's'}` : '';
  return [years, months].filter(Boolean).join(' ');
};

type Props = {
  bill: Bill | null; // null = closed
  onClose: () => void;
  onSave: (loan: Loan, useEmiAsAmount: boolean, emi: number, endMonth: string) => Promise<void>;
  onRemove: () => Promise<void>;
};

export default function LoanSheet({ bill, onClose, onSave, onRemove }: Props) {
  const [type, setType] = useState<LoanType>('personal');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [firstEmi, setFirstEmi] = useState(yearMonth(new Date()));
  const [useEmi, setUseEmi] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bill) return;
    const l = bill.loan;
    setType(l?.type ?? 'personal');
    setLender(l?.lender ?? '');
    setPrincipal(l ? String(l.principal) : '');
    setRate(l ? String(l.annualRate) : '');
    setTenure(l ? String(l.tenureMonths) : '');
    setFirstEmi(l?.firstEmiMonth ?? bill.startMonth);
    setUseEmi(true);
  }, [bill]);

  if (!bill) return null;

  const P = Number(principal);
  const R = Number(rate);
  const N = Math.round(Number(tenure));
  const valid = P > 0 && Number.isFinite(R) && R >= 0 && R <= 50 && N > 0 && N <= 480;
  const loan: Loan | null = valid
    ? {
        principal: P,
        annualRate: R,
        tenureMonths: N,
        firstEmiMonth: firstEmi,
        type,
        ...(lender.trim() ? { lender: lender.trim() } : {}),
        ...(bill.loan?.prepayments ? { prepayments: bill.loan.prepayments } : {}),
      }
    : null;
  const emi = loan ? calcEmi(P, R, N) : 0;
  const rows = loan ? buildSchedule(loan) : [];
  const totalInterest = rows.reduce((s, x) => s + x.interest, 0);
  const endMonth = rows.length ? rows[rows.length - 1].month : firstEmi;
  const differs = valid && Math.abs(Math.round(emi) - bill.amount) >= 1;

  const save = async () => {
    if (!loan) return;
    setBusy(true);
    try {
      await onSave(loan, differs && useEmi, Math.round(emi), endMonth);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={sheet.header}>
              <View style={sheet.iconCircle}>
                <Ionicons name="calculator-outline" size={18} color={Corpus.gold} />
              </View>
              <View style={sheet.titleBlock}>
                <Text style={sheet.title}>Loan details · {bill.name}</Text>
                <Text style={sheet.subtitle}>Unlocks balance, interest split and prepayment savings</Text>
              </View>
              <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={18} color={Corpus.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.label}>LOAN TYPE</Text>
            <View style={styles.templates}>
              {TYPES.map((t) => (
                <Pressable key={t.id} style={[sheet.chip, type === t.id && sheet.chipSuggested]} onPress={() => setType(t.id)}>
                  <Ionicons name={t.icon as any} size={12} color={type === t.id ? Corpus.gold : Corpus.textMuted} />
                  <Text style={[sheet.chipText, type === t.id && sheet.chipTextSuggested]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>LENDER (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={lender}
              onChangeText={setLender}
              placeholder="e.g. HDFC Bank, Bajaj Finance"
              placeholderTextColor={Corpus.textFaint}
              maxLength={30}
            />

            <Text style={styles.label}>LOAN AMOUNT (PRINCIPAL)</Text>
            <TextInput
              style={styles.input}
              value={principal}
              onChangeText={setPrincipal}
              placeholder="₹ e.g. 500000"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
            />

            <Text style={styles.label}>INTEREST RATE (% PER YEAR)</Text>
            <TextInput
              style={styles.input}
              value={rate}
              onChangeText={setRate}
              placeholder="e.g. 10.5"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>TENURE IN MONTHS (NUMBER OF EMIs)</Text>
            <TextInput
              style={styles.input}
              value={tenure}
              onChangeText={setTenure}
              placeholder="e.g. 60"
              placeholderTextColor={Corpus.textFaint}
              keyboardType="numeric"
            />
            {N > 0 && (
              <Text style={[styles.hint, { color: Corpus.gold }]}>
                {N} months = {tenureLabel(N)}
              </Text>
            )}
            <View style={styles.templates}>
              {TENURES.map((m) => (
                <Pressable key={m} style={[sheet.chip, N === m && sheet.chipSuggested]} onPress={() => setTenure(String(m))}>
                  <Text style={[sheet.chipText, N === m && sheet.chipTextSuggested]}>{m} months</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>FIRST EMI WAS IN</Text>
            <View style={styles.dayRow}>
              <Pressable style={styles.dayArrow} onPress={() => setFirstEmi(shiftYm(firstEmi, -1))}>
                <Ionicons name="chevron-back" size={18} color={Corpus.text} />
              </Pressable>
              <Text style={styles.dayText}>{ymLabel(firstEmi)}</Text>
              <Pressable style={styles.dayArrow} onPress={() => setFirstEmi(shiftYm(firstEmi, 1))}>
                <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
              </Pressable>
              <Pressable onPress={() => setFirstEmi(shiftYm(firstEmi, -12))} hitSlop={6}>
                <Text style={styles.yearJump}>−1 yr</Text>
              </Pressable>
            </View>

            {valid ? (
              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>
                    EMI {formatINR(Math.round(emi))} · ends {ymLabel(endMonth)}
                  </Text>
                  <Text style={styles.switchHint}>
                    Total interest {formatINR(Math.round(totalInterest))} · you repay {formatINR(Math.round(P + totalInterest))}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.hint}>Fill amount, rate and tenure to calculate your EMI.</Text>
            )}

            {differs && (
              <View style={styles.switchRow}>
                <View style={styles.switchBody}>
                  <Text style={styles.switchTitle}>Use {formatINR(Math.round(emi))} as the bill amount</Text>
                  <Text style={styles.switchHint}>Currently {formatINR(bill.amount)} — also sets the end month to {ymLabel(endMonth)}</Text>
                </View>
                <Switch value={useEmi} onValueChange={setUseEmi} trackColor={{ false: Corpus.border, true: Corpus.gold }} thumbColor={Corpus.text} />
              </View>
            )}

            <Pressable style={[sheet.saveButton, !valid && sheet.saveButtonDisabled]} onPress={save} disabled={!valid || busy}>
              {busy ? (
                <ActivityIndicator color="#0F1115" />
              ) : (
                <Text style={[sheet.saveText, !valid && sheet.saveTextDisabled]}>Save loan details</Text>
              )}
            </Pressable>
            {bill.loan && (
              <Pressable style={sheet.removeButton} onPress={onRemove} disabled={busy}>
                <Text style={sheet.removeText}>Remove loan details</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

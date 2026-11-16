import { Button, Choice, Field, Sheet, Stepper, Toggle } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill, Loan, LoanType } from '@/types/bill';
import { yearMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { buildSchedule, calcEmi } from '@/utils/loan';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const TYPES: { id: LoanType; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'car', label: 'Car', icon: 'car' },
  { id: 'bike', label: 'Bike', icon: 'bicycle' },
  { id: 'personal', label: 'Personal', icon: 'person' },
  { id: 'education', label: 'Education', icon: 'school' },
  { id: 'gadget', label: 'Gadget', icon: 'phone-portrait' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];
const TENURES = [12, 18, 24, 36, 60, 120, 180, 240];

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

  const interestShare = valid && P + totalInterest > 0 ? totalInterest / (P + totalInterest) : 0;

  return (
    <Sheet
      title={`Loan behind ${bill.name}`}
      subtitle="Shows what you still owe and what paying early saves"
      onClose={onClose}
      footer={
        <>
          <Button label="Save loan details" onPress={save} loading={busy} disabled={!valid} />
          {bill.loan && <Button variant="danger" icon="trash-outline" label="Remove loan details" onPress={onRemove} disabled={busy} />}
        </>
      }
    >
      <Choice label="Loan type" options={TYPES.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))} value={type} onChange={setType} />
      <Field label="Lender (optional)" value={lender} onChangeText={setLender} placeholder="HDFC Bank, Bajaj Finance" maxLength={30} />
      <Field label="Amount borrowed" money value={principal} onChangeText={(t) => setPrincipal(t.replace(/[^0-9.]/g, ''))} placeholder="500000" />
      <Field label="Interest rate, % a year" value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} placeholder="10.5" keyboardType="decimal-pad"
        error={rate.trim() !== '' && !(R >= 0 && R <= 50) ? 'Enter a rate from 0 to 50' : undefined} />
      <Field label="Number of EMIs" value={tenure} onChangeText={(t) => setTenure(t.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="60" keyboardType="number-pad"
        hint={N > 0 ? `${N} months is ${tenureLabel(N)}` : undefined} />
      <View style={st.chips}>
        {TENURES.map((m) => (
          <Pressable key={m} style={({ pressed }) => [st.chip, N === m && st.chipOn, pressed && { opacity: 0.7 }]} onPress={() => setTenure(String(m))} accessibilityRole="button" accessibilityState={{ selected: N === m }} accessibilityLabel={`${m} months`}>
            <Text style={[st.chipText, N === m && { color: Corpus.onGold }]}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <Stepper label="First EMI was in" value={ymLabel(firstEmi)} onPrev={() => setFirstEmi(shiftYm(firstEmi, -1))} onNext={() => setFirstEmi(shiftYm(firstEmi, 1))}
        extra={{ label: 'Back 1 year', onPress: () => setFirstEmi(shiftYm(firstEmi, -12)) }} />

      {valid ? (
        <View style={st.result} accessibilityLabel={`EMI ${formatINR(Math.round(emi))}, ends ${ymLabel(endMonth)}, total interest ${formatINR(Math.round(totalInterest))}`}>
          <View style={st.resultTop}>
            <View style={{ flex: 1 }}>
              <Text style={st.small}>Your EMI</Text>
              <Text style={st.big}>{formatINR(Math.round(emi))}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.small}>Last EMI</Text>
              <Text style={st.mid}>{ymLabel(endMonth)}</Text>
            </View>
          </View>
          <View style={st.split}>
            <View style={{ flex: 1 - interestShare, backgroundColor: Corpus.text }} />
            <View style={{ flex: interestShare, backgroundColor: Corpus.warning }} />
          </View>
          <View style={st.legend}>
            <Text style={st.small}>Borrowed {formatINR(P)}</Text>
            <Text style={[st.small, { color: Corpus.warning }]}>Interest {formatINR(Math.round(totalInterest))}</Text>
          </View>
          <Text style={st.small}>You repay {formatINR(Math.round(P + totalInterest))} in all.</Text>
        </View>
      ) : (
        <Text style={st.small}>Fill in the amount, rate and number of EMIs to see your EMI.</Text>
      )}

      {differs && (
        <Toggle icon="swap-horizontal" title={`Use ${formatINR(Math.round(emi))} as the bill amount`} value={useEmi} onChange={setUseEmi}
          hint={`The bill says ${formatINR(bill.amount)} now. This also sets the last payment to ${ymLabel(endMonth)}.`} />
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  chip: { minWidth: 48, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: Corpus.bg, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  result: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 16, gap: 10 },
  resultTop: { flexDirection: 'row', alignItems: 'flex-end' },
  big: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.5, ...tabular },
  mid: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  small: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18, ...tabular },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
});

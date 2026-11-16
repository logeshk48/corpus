import { Button, Field, Segmented } from '@/components/ui';
import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { useTween } from '@/hooks/useTween';
import type { Bill } from '@/types/bill';
import { isPaidThisMonth, isSkippedThisMonth } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { buildSchedule, loanStatus, prepaymentImpact, yearlySummary } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const ymLabel = (ym: string) =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const rupees = (n: number) => formatINR(Math.round(n));
const PREPAY = [5000, 10000, 25000, 50000, 100000];
const MODES = [{ value: 'tenure', label: 'Finish sooner' }, { value: 'emi', label: 'Lower my EMI' }] as const;

type Props = {
  bill: Bill;
  onEditLoan: () => void;
  onRecordPrepayment: (amount: number, mode: 'tenure' | 'emi') => Promise<void>;
};

// Everything a loan tells you: what is still owed, where each EMI goes, and what paying extra saves.
export default function LoanPanel({ bill, onEditLoan, onRecordPrepayment }: Props) {
  const [extra, setExtra] = useState('');
  const [mode, setMode] = useState<'tenure' | 'emi'>('tenure');
  const [showYears, setShowYears] = useState(false);
  const [busy, setBusy] = useState(false);

  const loan = bill.loan;
  const paid = isPaidThisMonth(bill) && !isSkippedThisMonth(bill);
  const st = loan ? loanStatus(loan, paid) : null;
  const owed = useTween(st?.outstanding ?? 0);
  const extraAmt = Number(extra);
  const validExtra = !!st && extraAmt > 0 && Number.isFinite(extraAmt) && !st.finished;
  const impact = loan && validExtra ? prepaymentImpact(loan, Math.min(extraAmt, st!.outstanding), mode) : null;
  const saved = useTween(impact?.interestSaved ?? 0);

  // No loan details yet: one row that invites you to add them
  if (!loan || !st) {
    return (
      <Pressable onPress={onEditLoan} style={({ pressed }) => [s.card, s.invite, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <Ionicons name="calculator" size={22} color={Corpus.text} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title}>Is this a loan?</Text>
          <Text style={s.text}>Add the amount and rate to see what you still owe and what paying early saves.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Corpus.textMuted} />
      </Pressable>
    );
  }

  const repaid = Math.min(st.principalRepaid / loan.principal, 1);
  const left = Math.max(st.totalCount - st.paidCount, 0);
  const cur = st.current;
  const years = showYears ? yearlySummary(buildSchedule(loan)) : [];
  const principalShare = cur && cur.emi > 0 ? cur.principal / cur.emi : 0;
  const interestDone = st.totalInterest > 0 ? st.interestPaid / st.totalInterest : 1;

  const record = async () => {
    if (!validExtra) return;
    setBusy(true);
    try { await onRecordPrepayment(Math.min(extraAmt, st.outstanding), mode); setExtra(''); } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: Space.md }}>
      <View style={s.card}>
        <View style={s.row}>
          <Text style={[s.label, { flex: 1 }]}>{st.finished ? 'Loan closed' : 'Still owed'}{loan.lender ? ` to ${loan.lender}` : ''}</Text>
          <Pressable onPress={onEditLoan} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit loan details">
            <Text style={s.link}>Edit</Text>
          </Pressable>
        </View>
        <Text style={s.big}>{rupees(owed)}</Text>
        <Text style={s.text}>of {rupees(loan.principal)} at {loan.annualRate}% a year</Text>

        {/* One cell per EMI when they fit; otherwise a single bar */}
        {st.totalCount <= 36 ? (
          <View style={s.cells} accessibilityLabel={`${st.paidCount} of ${st.totalCount} EMIs paid`}>
            {Array.from({ length: st.totalCount }, (_, i) => (
              <View key={i} style={[s.cell, i < st.paidCount ? s.cellPaid : i === st.paidCount ? s.cellNext : null]} />
            ))}
          </View>
        ) : (
          <View style={s.bar}><View style={{ width: `${repaid * 100}%`, backgroundColor: Corpus.income }} /></View>
        )}
        <Text style={s.text}>
          <Text style={s.strong}>{Math.round(repaid * 100)}% paid off.</Text> {left === 0 ? 'Nothing left.' : `${left} EMI${left === 1 ? '' : 's'} left, the last in ${ymLabel(st.endMonth)}.`}
        </Text>

        <View style={s.strip}>
          <View style={s.stat}><Text style={s.statLabel}>EMI</Text><Text style={s.statValue}>{rupees(st.emi || bill.amount)}</Text></View>
          <View style={s.rule} />
          <View style={s.stat}><Text style={s.statLabel}>Paid</Text><Text style={s.statValue}>{st.paidCount} of {st.totalCount}</Text></View>
          {st.totalPrepaid > 0 && <><View style={s.rule} /><View style={s.stat}><Text style={s.statLabel}>Paid extra</Text><Text style={s.statValue}>{rupees(st.totalPrepaid)}</Text></View></>}
        </View>
      </View>

      {cur && !st.finished && (
        <View style={s.card}>
          <Text style={s.title}>Where this month's {rupees(cur.emi)} goes</Text>
          <View style={s.bar} accessibilityLabel={`${Math.round(principalShare * 100)} percent clears the loan, the rest is interest`}>
            <View style={{ flex: principalShare, backgroundColor: Corpus.income }} />
            <View style={{ flex: 1 - principalShare, backgroundColor: Corpus.warning }} />
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.statValue}>{rupees(cur.principal)}</Text>
              <Text style={s.statLabel}>Clears the loan, {Math.round(principalShare * 100)}%</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.statValue, { color: Corpus.warning }]}>{rupees(cur.interest)}</Text>
              <Text style={s.statLabel}>Interest, {Math.round((1 - principalShare) * 100)}%</Text>
            </View>
          </View>
          <View style={s.divider} />
          <Text style={s.label}>Interest over the whole loan</Text>
          <View style={s.bar}><View style={{ width: `${interestDone * 100}%`, backgroundColor: Corpus.warning }} /></View>
          <Text style={s.text}>
            <Text style={s.strong}>{rupees(st.interestPaid)}</Text> paid so far, <Text style={s.strong}>{rupees(st.interestRemaining)}</Text> still ahead, {rupees(st.totalInterest)} in all.
          </Text>
        </View>
      )}

      {!st.finished && (
        <View style={s.card}>
          <Text style={s.title}>Pay extra, save interest</Text>
          <Field label="Extra amount" money value={extra} onChangeText={(t) => setExtra(t.replace(/[^0-9]/g, ''))} placeholder="0"
            hint={extraAmt > st.outstanding ? `You only owe ${rupees(st.outstanding)}, so that is what gets counted` : undefined} />
          <View style={s.chips}>
            {PREPAY.filter((c) => c < st.outstanding).map((c) => (
              <Pressable key={c} style={({ pressed }) => [s.chip, extraAmt === c && s.chipOn, pressed && { opacity: 0.7 }]} onPress={() => setExtra(String(c))} accessibilityRole="button" accessibilityState={{ selected: extraAmt === c }}>
                <Text style={[s.chipText, extraAmt === c && { color: Corpus.onGold }]}>{rupees(c)}</Text>
              </Pressable>
            ))}
            <Pressable style={({ pressed }) => [s.chip, extraAmt === Math.round(st.outstanding) && s.chipOn, pressed && { opacity: 0.7 }]} onPress={() => setExtra(String(Math.round(st.outstanding)))} accessibilityRole="button">
              <Text style={[s.chipText, extraAmt === Math.round(st.outstanding) && { color: Corpus.onGold }]}>All of it</Text>
            </Pressable>
          </View>
          <Segmented options={MODES} value={mode} onChange={setMode} />

          {impact && (
            <Animated.View entering={FadeIn.duration(200)} style={s.result}>
              <Text style={s.resultLabel}>You save</Text>
              <Text style={s.resultBig}>{rupees(saved)}</Text>
              <Text style={s.text}>
                {mode === 'tenure'
                  ? impact.monthsSaved > 0
                    ? `in interest, and finish ${impact.monthsSaved} month${impact.monthsSaved === 1 ? '' : 's'} sooner. Last EMI in ${ymLabel(impact.newEndMonth)}, not ${ymLabel(st.endMonth)}.`
                    : 'in interest. This closes the loan.'
                  : `in interest. Your EMI drops from ${rupees(st.emi || bill.amount)} to ${rupees(impact.newEmi)} and the last EMI stays ${ymLabel(st.endMonth)}.`}
              </Text>
              {mode === 'emi' && <Text style={s.text}>Finishing sooner usually saves more.</Text>}
            </Animated.View>
          )}
          {impact && <Button variant="secondary" icon="checkmark" label={`I paid this ${rupees(Math.min(extraAmt, st.outstanding))} extra`} onPress={record} loading={busy} />}
          <Text style={s.note}>An estimate on the usual reducing balance method. Your lender may charge a fee for paying early.</Text>
        </View>
      )}

      <View style={s.card}>
        <Pressable style={[s.row, { minHeight: 32 }]} onPress={() => setShowYears(!showYears)} accessibilityRole="button" accessibilityState={{ expanded: showYears }}>
          <Text style={[s.title, { flex: 1 }]}>Year by year</Text>
          <Ionicons name={showYears ? 'chevron-up' : 'chevron-down'} size={18} color={Corpus.textMuted} />
        </Pressable>
        {showYears && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={s.yearRow}>
              <Text style={[s.th, { flex: 0.7, textAlign: 'left' }]}>Year</Text>
              <Text style={s.th}>Loan cleared</Text>
              <Text style={s.th}>Interest</Text>
              <Text style={s.th}>Left</Text>
            </View>
            {years.map((y) => (
              <View key={y.year} style={[s.yearRow, s.yearLine]}>
                <Text style={[s.td, { flex: 0.7, textAlign: 'left' }]}>{y.year}</Text>
                <Text style={s.td}>{rupees(y.principal + y.prepayment)}</Text>
                <Text style={[s.td, { color: Corpus.warning }]}>{rupees(y.interest)}</Text>
                <Text style={s.td}>{rupees(y.balance)}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 10 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  link: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, textDecorationLine: 'underline' },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  big: { fontSize: Type.amount, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  text: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19, ...tabular },
  strong: { color: Corpus.text, fontFamily: Font.display },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  cell: { width: 18, height: 18, borderRadius: 6, backgroundColor: Corpus.cardAlt },
  cellPaid: { backgroundColor: Corpus.income },
  cellNext: { borderWidth: 1.5, borderColor: Corpus.text },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Corpus.cardAlt, gap: 2 },
  strip: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  rule: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: Corpus.border, marginHorizontal: 12 },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  statValue: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginVertical: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.bg, justifyContent: 'center' },
  chipOn: { backgroundColor: Corpus.gold },
  chipText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  result: { backgroundColor: Corpus.incomeTint, borderRadius: 18, padding: 16, gap: 2 },
  resultLabel: { fontSize: Type.body, color: Corpus.text },
  resultBig: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.income, letterSpacing: -0.5, ...tabular },
  yearRow: { flexDirection: 'row', paddingVertical: 8 },
  yearLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  th: { flex: 1, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted },
  td: { flex: 1, textAlign: 'right', fontSize: Type.body, color: Corpus.text, ...tabular },
});

import { Button, Group, GroupRow, IconButton, IconChip, Screen } from '@/components/ui';
import { CategoryChip, Chip } from '@/constants/theme';
import { findCategory } from '@/constants/categories';
import Shine from '@/components/fx/Shine';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { useTransactions } from '@/hooks/useTransactions';
import {
  deleteBill,
  logBillForThisMonth,
  restoreBillState,
  skipBillThisMonth,
  undoBillPayment,
  updateBill,
} from '@/services/bills';
import type { Bill, NewBill } from '@/types/bill';
import {
  dueThisMonth,
  endLabel,
  frequencyLabel,
  isFinished,
  remainingPayments,
  isAuto,
  isDayPlan,
  isPaidThisMonth,
  isSkippedThisMonth,
  needsAmount,
  nextDue,
  ordinal,
  yearlyCost,
} from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BillSheet, { type BillSheetMode } from './components/BillSheet';
import PayBillSheet from './components/PayBillSheet';
import LoanPanel from './components/LoanPanel';
import LoanSheet from './components/LoanSheet';
import { addTransaction, deleteTransaction } from '@/services/transactions';
import { endMonthFor, loanStatus } from '@/utils/loan';
import type { Loan } from '@/types/bill';
import { styles } from './BillDetailScreen.styles';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { bills, loading } = useBills();
  const { transactions } = useTransactions('last12Months');
  const [mode, setMode] = useState<BillSheetMode>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [editingLoan, setEditingLoan] = useState(false);

  const bill = bills.find((b) => b.id === id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/bills' as Href));

  if (loading || !bill) {
    return (
      <Screen title={loading ? 'Bill' : 'Not found'} onBack={goBack}>
        {loading ? <View style={{ height: 200, borderRadius: 24, backgroundColor: Corpus.card }} accessibilityLabel="Loading" accessibilityState={{ busy: true }} /> : <Text style={styles.muted}>This bill was deleted.</Text>}
      </Screen>
    );
  }

  // Payments made from this bill (newest first)
  const payments = transactions.filter((t) => t.recurringId === bill.id);
  const thisYear = new Date().getFullYear();
  const paidThisYear = payments
    .filter((t) => new Date(t.date).getFullYear() === thisYear)
    .reduce((s, t) => s + t.amount, 0);
  const average = payments.length > 0 ? Math.round(payments.reduce((s, t) => s + t.amount, 0) / payments.length) : 0;

  const due = nextDue(bill);
  const dueNow = dueThisMonth(bill) && !isPaidThisMonth(bill);
  let status = { text: `Next due ${due.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, color: Corpus.textMuted, bg: Corpus.bg };
  if (isFinished(bill)) status = { text: 'Completed. All payments done', color: Corpus.income, bg: Corpus.incomeTint };
  else if (!bill.active) status = { text: 'Paused', color: Corpus.textFaint, bg: Corpus.bg };
  else if (needsAmount(bill)) status = { text: "Due. Enter the amount", color: Corpus.warning, bg: Corpus.warningTint };
  else if (dueNow && due.daysAway < 0) status = { text: `${-due.daysAway} day${due.daysAway === -1 ? '' : 's'} late`, color: Corpus.danger, bg: Corpus.dangerTint };
  else if (dueNow) status = { text: due.daysAway === 0 ? 'Due today' : `Due in ${due.daysAway} days`, color: Corpus.gold, bg: Corpus.goldActive };
  else if (isSkippedThisMonth(bill)) status = { text: 'Skipped this month', color: Corpus.textMuted, bg: Corpus.bg };
  else if (isPaidThisMonth(bill)) status = { text: 'Paid this month', color: Corpus.income, bg: Corpus.incomeTint };

  const pay = async (b: Bill, amount: number, paidOn: Date) => {
    try {
      await logBillForThisMonth(b, amount, new Date(), paidOn);
      setPaying(null);
      showToast({ message: `${b.name} ${formatINR(amount)} recorded`, actionLabel: 'Undo', onAction: () => undoBillPayment(b) });
    } catch (e) {
      console.error('Pay bill failed:', e);
      showToast({ message: 'Could not record the payment. Try again.' });
    }
  };
  const skip = async (b: Bill) => {
    try {
      await skipBillThisMonth(b);
      setPaying(null);
      showToast({ message: `${b.name} skipped`, actionLabel: 'Undo', onAction: () => restoreBillState(b) });
    } catch (e) {
      console.error('Skip bill failed:', e);
      showToast({ message: 'Could not skip. Try again.' });
    }
  };
  // ── Loan v2 ──
  const saveLoan = async (loan: Loan, useEmiAsAmount: boolean, emi: number, endMonth: string) => {
    try {
      await updateBill(bill.id, { loan, endMonth, ...(useEmiAsAmount ? { amount: emi } : {}) });
      setEditingLoan(false);
      showToast({ message: 'Loan details saved' });
    } catch (e) {
      console.error('Save loan failed:', e);
      showToast({ message: 'Could not save loan details. Try again.' });
    }
  };
  const removeLoan = async () => {
    try {
      await updateBill(bill.id, { loan: undefined });
      setEditingLoan(false);
      showToast({ message: 'Loan details removed' });
    } catch (e) {
      console.error('Remove loan failed:', e);
      showToast({ message: 'Could not remove. Try again.' });
    }
  };
  const recordPrepayment = async (amount: number, mode: 'tenure' | 'emi') => {
    if (!bill.loan) return;
    const before = { loan: bill.loan, endMonth: bill.endMonth, amount: bill.amount };
    const loan: Loan = {
      ...bill.loan,
      prepayments: [...(bill.loan.prepayments ?? []), { date: new Date().toISOString(), amount, mode }],
    };
    const newEnd = endMonthFor(loan);
    const newEmi = Math.round(loanStatus(loan, isPaidThisMonth(bill)).emi);
    try {
      // The prepayment is real money out → record it as an expense too
      const txId = await addTransaction({
        type: 'expense',
        amount,
        category: bill.category,
        note: `${bill.name} prepayment`,
        date: new Date().toISOString(),
      });
      await updateBill(bill.id, { loan, endMonth: newEnd, ...(mode === 'emi' ? { amount: newEmi } : {}) });
      showToast({
        message: mode === 'emi' ? `Extra payment saved. New EMI ${formatINR(newEmi)}` : 'Extra payment saved. The loan ends sooner',
        actionLabel: 'Undo',
        onAction: async () => {
          await deleteTransaction(txId);
          await updateBill(bill.id, before);
        },
      });
    } catch (e) {
      console.error('Record prepayment failed:', e);
      showToast({ message: 'Could not save the prepayment. Try again.' });
    }
  };

  const save = async (b: NewBill) => {
    try {
      await updateBill(bill.id, b);
      setMode(null);
      showToast({ message: `${b.name} updated` });
    } catch (e) {
      console.error('Update bill failed:', e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };
  const remove = async (b: Bill) => {
    try {
      await deleteBill(b.id);
      setMode(null);
      showToast({ message: `${b.name} deleted` });
      goBack();
    } catch (e) {
      console.error('Delete bill failed:', e);
      showToast({ message: 'Could not delete. Try again.' });
    }
  };

  return (
    <>
      <Screen title={bill.name} tone={CategoryChip[bill.category] ?? Chip.red} right={<IconButton icon="create-outline" label="Edit bill" onPress={() => setMode({ kind: 'edit', bill })} />} onBack={goBack}>
        <View style={[styles.hero, { overflow: 'hidden' }]}>
          <Shine />
          <IconChip icon={bill.variable ? 'flash' : findCategory('expense', bill.category)?.icon ?? 'repeat'} color={CategoryChip[bill.category] ?? Chip.red} size={44} />
          <Text style={styles.heroAmount}>
            {bill.variable ? 'about ' : ''}
            {formatINR(bill.amount)}
          </Text>
          <Text style={styles.heroFreq}>
            {frequencyLabel(bill)}{isDayPlan(bill) ? '' : `, on the ${ordinal(bill.dayOfMonth)}`}
            {isAuto(bill) && !bill.variable ? '. Records itself' : ''}
            {bill.variable ? '. The amount varies' : ''}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {bill.active && dueNow && (
          <View style={{ gap: 8 }}>
            <Button icon={bill.variable ? 'create' : 'checkmark'} label={bill.variable ? 'Enter amount' : 'Mark paid'} onPress={() => setPaying(bill)} />
            <Button variant="quiet" label="Skip this one" onPress={() => skip(bill)} />
          </View>
        )}

        {bill.endMonth && !bill.loan && (() => {
          const left = remainingPayments(bill) ?? 0;
          const done = payments.length;
          const total = done + left;
          return (
            <View style={d.card}>
              <View style={d.row}>
                <Text style={[d.title, { flex: 1 }]}>{isFinished(bill) ? 'All paid off' : `${left} payment${left === 1 ? '' : 's'} left`}</Text>
                <Text style={d.muted}>Last one {endLabel(bill)}</Text>
              </View>
              <View style={d.bar}><View style={{ width: `${total > 0 ? (done / total) * 100 : 100}%`, backgroundColor: Corpus.income }} /></View>
              <Text style={d.muted}>
                {isFinished(bill) ? 'Corpus has stopped recording this bill.' : `${formatINR(left * bill.amount)} still to pay${done > 0 ? `, ${done} recorded here so far` : ''}.`}
              </Text>
            </View>
          );
        })()}

        {(bill.loan || bill.endMonth || /emi|loan/i.test(bill.name)) && (
          <LoanPanel bill={bill} onEditLoan={() => setEditingLoan(true)} onRecordPrepayment={recordPrepayment} />
        )}

        <View style={[d.card, d.strip]}>
          <View style={d.stat}><Text style={d.muted}>Paid in {thisYear}</Text><Text style={d.value}>{formatINR(paidThisYear)}</Text></View>
          <View style={d.rule} />
          <View style={d.stat}><Text style={d.muted}>A full year</Text><Text style={d.value}>{formatINR(yearlyCost(bill))}</Text></View>
          {bill.variable && average > 0 && <><View style={d.rule} /><View style={d.stat}><Text style={d.muted}>Average</Text><Text style={d.value}>{formatINR(average)}</Text></View></>}
        </View>

        <Group title="Payments">
          {payments.length === 0 ? (
            <View style={d.empty}>
              <Text style={d.title}>Nothing recorded yet</Text>
              <Text style={d.muted}>Each payment shows up here, with how it compares to the one before.</Text>
            </View>
          ) : (
            payments.map((t, i) => {
              const prev = payments[i + 1]; // older payment
              const diff = prev ? t.amount - prev.amount : 0;
              const day = new Date(t.date);
              return (
                <GroupRow
                  key={t.id}
                  icon="checkmark"
                  color={Chip.green}
                  title={day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  subtitle={diff !== 0 ? `${formatINR(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the time before` : undefined}
                  value={formatINR(t.amount)}
                  onPress={() => router.push({ pathname: '/edit/[id]', params: { id: t.id } })}
                />
              );
            })
          )}
        </Group>
      </Screen>

      <BillSheet mode={mode} onClose={() => setMode(null)} onSave={(b) => save(b)} onDelete={remove} />
      <PayBillSheet bill={paying} onClose={() => setPaying(null)} onPay={pay} onSkip={skip} />
      <LoanSheet
        bill={editingLoan ? bill : null}
        onClose={() => setEditingLoan(false)}
        onSave={saveLoan}
        onRemove={removeLoan}
      />
    </>
  );
}

const d = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  muted: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19, ...tabular },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Corpus.cardAlt },
  strip: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 2 },
  rule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Corpus.border, marginHorizontal: 14 },
  value: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  empty: { padding: 18, gap: 4 },
});

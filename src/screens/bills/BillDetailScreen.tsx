import { Corpus } from '@/constants/theme';
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
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Pressable onPress={goBack} style={styles.roundButton} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Corpus.text} />
            </Pressable>
          </View>
          <View style={styles.center}>
            {loading ? <ActivityIndicator color={Corpus.gold} /> : <Text style={styles.muted}>This bill no longer exists</Text>}
          </View>
        </View>
      </SafeAreaView>
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
  if (isFinished(bill)) status = { text: '🎉 Completed — all payments done', color: Corpus.income, bg: Corpus.incomeTint };
  else if (!bill.active) status = { text: 'Paused', color: Corpus.textFaint, bg: Corpus.bg };
  else if (needsAmount(bill)) status = { text: "Due — enter this month's amount", color: Corpus.warning, bg: Corpus.warningTint };
  else if (dueNow && due.daysAway < 0) status = { text: `${-due.daysAway} days overdue`, color: Corpus.danger, bg: Corpus.dangerTint };
  else if (dueNow) status = { text: due.daysAway === 0 ? 'Due today' : `Due in ${due.daysAway} days`, color: Corpus.gold, bg: Corpus.goldActive };
  else if (isSkippedThisMonth(bill)) status = { text: 'Skipped this month', color: Corpus.textMuted, bg: Corpus.bg };
  else if (isPaidThisMonth(bill)) status = { text: '✓ Paid this month', color: Corpus.income, bg: Corpus.incomeTint };

  const pay = async (b: Bill, amount: number) => {
    try {
      await logBillForThisMonth(b, amount);
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
      showToast({ message: `${b.name} skipped this month`, actionLabel: 'Undo', onAction: () => restoreBillState(b) });
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
        message: mode === 'emi' ? `Prepayment saved · new EMI ${formatINR(newEmi)}` : `Prepayment saved · loan now ends earlier`,
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.roundButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>{bill.name}</Text>
          <Pressable onPress={() => setMode({ kind: 'edit', bill })} style={styles.roundButton} hitSlop={10}>
            <Ionicons name="create-outline" size={17} color={Corpus.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={bill.variable ? 'flash' : 'repeat'} size={24} color="#C88BDB" />
          </View>
          <Text style={styles.heroAmount}>
            {bill.variable ? '~' : ''}
            {formatINR(bill.amount)}
          </Text>
          <Text style={styles.heroFreq}>
            {frequencyLabel(bill)} · on the {ordinal(bill.dayOfMonth)}
            {bill.variable ? ' · amount varies' : ''}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {bill.endMonth && !bill.loan && (() => {
          const left = remainingPayments(bill) ?? 0;
          const done = payments.length;
          const total = done + left;
          const pct = total > 0 ? (done / total) * 100 : 100;
          return (
            <View style={styles.loanCard}>
              <View style={styles.loanTop}>
                <Ionicons name="flag-outline" size={15} color={Corpus.gold} />
                <Text style={styles.loanTitle}>{isFinished(bill) ? 'Loan completed 🎉' : 'Loan progress'}</Text>
                <Text style={styles.loanEnd}>Last payment {endLabel(bill)}</Text>
              </View>
              <View style={styles.loanTrack}>
                <View style={[styles.loanFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.loanText}>
                {isFinished(bill)
                  ? 'All payments done. Corpus has stopped logging this bill.'
                  : `${left} payment${left === 1 ? '' : 's'} left · ${formatINR(left * bill.amount)} still to pay` +
                    (done > 0 ? ` · ${done} recorded in Corpus` : '')}
              </Text>
            </View>
          );
        })()}

        {(bill.loan || bill.endMonth || /emi|loan/i.test(bill.name)) && (
          <LoanPanel bill={bill} onEditLoan={() => setEditingLoan(true)} onRecordPrepayment={recordPrepayment} />
        )}

        {bill.active && dueNow && (
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => setPaying(bill)}>
              <Ionicons name={bill.variable ? 'create' : 'checkmark'} size={16} color="#0F1115" />
              <Text style={styles.primaryText}>{bill.variable ? 'Enter amount' : 'Pay now'}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => skip(bill)}>
              <Ionicons name="play-skip-forward" size={15} color={Corpus.text} />
              <Text style={styles.secondaryText}>Skip month</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Paid in {thisYear}</Text>
            <Text style={styles.statValue}>{formatINR(paidThisYear)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Costs per year</Text>
            <Text style={styles.statValue}>{formatINR(yearlyCost(bill))}</Text>
          </View>
          {bill.variable && (
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Average</Text>
              <Text style={styles.statValue}>{average > 0 ? formatINR(average) : '—'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>PAYMENT HISTORY · LAST 12 MONTHS</Text>
        <View style={styles.group}>
          {payments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={26} color={Corpus.textFaint} />
              <Text style={styles.emptyText}>No payments recorded yet</Text>
            </View>
          ) : (
            payments.map((t, i) => {
              const prev = payments[i + 1]; // older payment
              const diff = prev ? t.amount - prev.amount : 0;
              const d = new Date(t.date);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: '/edit/[id]', params: { id: t.id } })}
                  style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
                >
                  <Ionicons name="checkmark-circle" size={20} color={Corpus.income} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowMonth}>{d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
                    <Text style={styles.rowDate}>Paid {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowAmount}>{formatINR(t.amount)}</Text>
                    {diff !== 0 && (
                      <Text style={[styles.change, { color: diff > 0 ? Corpus.danger : Corpus.income }]}>
                        {diff > 0 ? '↑' : '↓'} {formatINR(Math.abs(diff))} vs last time
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <BillSheet mode={mode} onClose={() => setMode(null)} onSave={(b) => save(b)} onDelete={remove} />
      <PayBillSheet bill={paying} onClose={() => setPaying(null)} onPay={pay} onSkip={skip} />
      <LoanSheet
        bill={editingLoan ? bill : null}
        onClose={() => setEditingLoan(false)}
        onSave={saveLoan}
        onRemove={removeLoan}
      />
    </SafeAreaView>
  );
}

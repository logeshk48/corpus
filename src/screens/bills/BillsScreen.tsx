import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useBills } from '@/hooks/useBills';
import { useTransactions } from '@/hooks/useTransactions';
import {
  addBill,
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
  isFinished,
  isPaidThisMonth,
  isSkippedThisMonth,
  monthlyBillsTotal,
  needsAmount,
  nextDue,
  ordinal,
  unpaidThisMonth,
  yearlyBillsTotal,
  yearMonth,
} from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { loanStatus } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BillCalendar from './components/BillCalendar';
import BillRow from './components/BillRow';
import BillSheet, { BILL_TEMPLATES, type BillSheetMode } from './components/BillSheet';
import PayBillSheet from './components/PayBillSheet';
import { styles } from './BillsScreen.styles';

const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function whenText(daysAway: number) {
  if (daysAway < 0) return `${-daysAway} day${daysAway === -1 ? '' : 's'} overdue`;
  if (daysAway === 0) return 'Due today';
  if (daysAway === 1) return 'Due tomorrow';
  return `in ${daysAway} days`;
}

// Average monthly income over the last 3 months that had income
function averageIncome(tx: { type: string; amount: number; date: string }[]) {
  const now = new Date();
  const totals = new Map<string, number>();
  for (const t of tx) {
    if (t.type !== 'income') continue;
    const d = new Date(t.date);
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (diff < 0 || diff > 2) continue;
    const key = yearMonth(d);
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  if (totals.size === 0) return 0;
  return [...totals.values()].reduce((a, b) => a + b, 0) / totals.size;
}

export default function BillsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { bills, loading } = useBills();
  const { transactions: yearTx } = useTransactions('last12Months');
  const [mode, setMode] = useState<BillSheetMode>(null);
  const [paying, setPaying] = useState<Bill | null>(null);

  const now = new Date();
  const monthly = monthlyBillsTotal(bills);
  const yearly = yearlyBillsTotal(bills);
  const dueTotal = bills.filter((b) => dueThisMonth(b)).reduce((s, b) => s + b.amount, 0);
  const unpaid = unpaidThisMonth(bills);
  const paidAmount = dueTotal - unpaid;
  const income = averageIncome(yearTx);
  const ratio = income > 0 ? Math.round((monthly / income) * 100) : null;
  const subscriptionsYearly = bills
    .filter((b) => b.active && b.category === 'fun')
    .reduce((s, b) => s + b.amount * ({ monthly: 12, quarterly: 4, yearly: 1 } as const)[b.frequency ?? 'monthly'], 0);

  // ── Loans overview ──
  const loans = bills
    .filter((b) => b.loan && !isFinished(b))
    .map((b) => loanStatus(b.loan!, isPaidThisMonth(b) && !isSkippedThisMonth(b)))
    .filter((st) => !st.finished);
  const totalOwed = loans.reduce((s, st) => s + st.outstanding, 0);
  const interestAhead = loans.reduce((s, st) => s + st.interestRemaining, 0);

  // ── Sections ──
  const active = bills.filter((b) => b.active && !isFinished(b));
  const completed = bills.filter((b) => isFinished(b));
  const attention = active.filter((b) => needsAmount(b));
  const unpaidDue = active.filter((b) => dueThisMonth(b) && !isPaidThisMonth(b) && !needsAmount(b));
  const thisWeek = unpaidDue.filter((b) => nextDue(b).daysAway <= 7);
  const laterThisMonth = unpaidDue.filter((b) => nextDue(b).daysAway > 7);
  const paid = active.filter((b) => dueThisMonth(b) && isPaidThisMonth(b));
  const later = active.filter((b) => !dueThisMonth(b));
  const paused = bills.filter((b) => !b.active && !isFinished(b));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const openBill = (b: Bill) => router.push(`/bill/${b.id}` as Href);

  // ── Actions ──
  const save = async (bill: NewBill, paidThisMonth: boolean) => {
    try {
      if (mode?.kind === 'edit') {
        await updateBill(mode.bill.id, bill);
        showToast({ message: `${bill.name} updated` });
      } else {
        await addBill(paidThisMonth ? { ...bill, lastLoggedMonth: yearMonth(new Date()) } : bill);
        showToast({ message: `${bill.name} added` });
      }
      setMode(null);
    } catch (e) {
      console.error('Save bill failed:', e);
      showToast({ message: 'Could not save the bill. Try again.' });
    }
  };

  const remove = async (bill: Bill) => {
    try {
      await deleteBill(bill.id);
      setMode(null);
      showToast({ message: `${bill.name} deleted` });
    } catch (e) {
      console.error('Delete bill failed:', e);
      showToast({ message: 'Could not delete. Try again.' });
    }
  };

  const pay = async (bill: Bill, amount: number) => {
    try {
      await logBillForThisMonth(bill, amount);
      setPaying(null);
      showToast({
        message: `${bill.name} ${formatINR(amount)} recorded`,
        actionLabel: 'Undo',
        onAction: () => undoBillPayment(bill),
      });
    } catch (e) {
      console.error('Pay bill failed:', e);
      showToast({ message: 'Could not record the payment. Try again.' });
    }
  };

  const skip = async (bill: Bill) => {
    try {
      await skipBillThisMonth(bill);
      setPaying(null);
      showToast({ message: `${bill.name} skipped this month`, actionLabel: 'Undo', onAction: () => restoreBillState(bill) });
    } catch (e) {
      console.error('Skip bill failed:', e);
      showToast({ message: 'Could not skip. Try again.' });
    }
  };

  // ── Section renderer ──
  const section = (
    title: string,
    list: Bill[],
    status: (b: Bill) => { text: string; color: string },
    action?: (b: Bill) => { label: string; filled?: boolean; onPress: () => void } | undefined
  ) =>
    list.length > 0 && (
      <>
        <Text style={styles.sectionLabel}>{title}</Text>
        <View style={styles.group}>
          {list.map((b, i) => (
            <BillRow
              key={b.id}
              bill={b}
              first={i === 0}
              status={status(b)}
              action={action?.(b)}
              onOpen={() => openBill(b)}
            />
          ))}
        </View>
      </>
    );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Recurring bills</Text>
          {bills.length > 0 && (
            <Pressable style={styles.addButton} onPress={() => setMode({ kind: 'new' })}>
              <Ionicons name="add" size={14} color="#0F1115" />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>Never type your rent again</Text>
            <Text style={styles.welcomeText}>
              Add costs that repeat — monthly, every 3 months or yearly. Corpus logs fixed bills on
              their due day, asks you for variable ones like electricity, and keeps the money aside
              in Safe-to-Spend until then.
            </Text>
            <View style={styles.templates}>
              {BILL_TEMPLATES.map((t) => (
                <Pressable key={t.name} style={styles.template} onPress={() => setMode({ kind: 'new', template: t })}>
                  <Ionicons name={t.icon as any} size={13} color={Corpus.gold} />
                  <Text style={styles.templateText}>{t.name}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.template} onPress={() => setMode({ kind: 'new' })}>
                <Ionicons name="add" size={13} color={Corpus.gold} />
                <Text style={styles.templateText}>Other</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* ── Insights hero ── */}
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>FIXED COSTS</Text>
              <Text style={styles.heroAmount}>{formatINR(monthly)}</Text>
              <Text style={styles.heroPer}>per month on average</Text>
              <Text style={styles.heroYear}>{formatINR(yearly)} a year</Text>
              {dueTotal > 0 && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>{now.toLocaleDateString('en-IN', { month: 'long' })}</Text>
                    <Text style={styles.progressValue}>
                      {formatINR(paidAmount)} paid · {formatINR(unpaid)} to go
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.min((paidAmount / dueTotal) * 100, 100)}%` }]} />
                  </View>
                </View>
              )}
            </View>

            {ratio !== null && (
              <View
                style={[
                  styles.insight,
                  ratio <= 50
                    ? { backgroundColor: Corpus.incomeTint, borderColor: Corpus.incomeLine }
                    : { backgroundColor: Corpus.warningTint, borderColor: Corpus.warningLine },
                ]}
              >
                <Ionicons name="pie-chart-outline" size={17} color={ratio <= 50 ? Corpus.income : Corpus.warning} />
                <Text style={styles.insightText}>
                  Fixed bills take <Text style={{ fontWeight: '700' }}>{ratio}%</Text> of your income.{' '}
                  <Text style={styles.insightMuted}>
                    {ratio <= 50
                      ? 'Healthy — a common guideline (50/30/20) keeps needs under 50%.'
                      : 'Above the common 50% guideline for needs — worth reviewing subscriptions.'}
                  </Text>
                </Text>
              </View>
            )}
            {subscriptionsYearly > 0 && (
              <View style={[styles.insight, { backgroundColor: Corpus.card, borderColor: Corpus.border }]}>
                <Ionicons name="tv-outline" size={17} color={Corpus.gold} />
                <Text style={styles.insightText}>
                  Entertainment subscriptions cost <Text style={{ fontWeight: '700' }}>{formatINR(subscriptionsYearly)}</Text> a
                  year. <Text style={styles.insightMuted}>Still using all of them?</Text>
                </Text>
              </View>
            )}

            {loans.length > 0 && (
              <View style={[styles.insight, { backgroundColor: Corpus.goldTint, borderColor: Corpus.goldLine }]}>
                <Ionicons name="business-outline" size={17} color={Corpus.gold} />
                <Text style={styles.insightText}>
                  You owe <Text style={{ fontWeight: '700' }}>{formatINR(Math.round(totalOwed))}</Text> across{' '}
                  {loans.length} loan{loans.length === 1 ? '' : 's'}.{' '}
                  <Text style={styles.insightMuted}>
                    {formatINR(Math.round(interestAhead))} of interest is still ahead — open a loan to see how
                    prepaying could cut it.
                  </Text>
                </Text>
              </View>
            )}

            <BillCalendar bills={bills} />

            {section(
              '⚠️ NEEDS YOUR INPUT',
              attention,
              (b) => ({ text: `Due ${shortDate(nextDue(b).date)} · enter this month's amount`, color: Corpus.warning }),
              (b) => ({ label: 'Enter amount', filled: true, onPress: () => setPaying(b) })
            )}
            {section(
              'DUE THIS WEEK',
              thisWeek,
              (b) => {
                const d = nextDue(b).daysAway;
                return { text: `${ordinal(b.dayOfMonth)} · ${whenText(d)}`, color: d <= 1 ? Corpus.warning : Corpus.textMuted };
              },
              (b) => ({ label: 'Pay now', onPress: () => setPaying(b) })
            )}
            {section(
              'LATER THIS MONTH',
              laterThisMonth,
              (b) => ({ text: `${ordinal(b.dayOfMonth)} · ${whenText(nextDue(b).daysAway)}`, color: Corpus.textMuted }),
              (b) => ({ label: 'Pay now', onPress: () => setPaying(b) })
            )}
            {section('PAID THIS MONTH', paid, (b) =>
              isSkippedThisMonth(b)
                ? { text: `Skipped · next ${shortDate(nextDue(b).date)}`, color: Corpus.textFaint }
                : { text: `✓ Paid · next ${shortDate(nextDue(b).date)}`, color: Corpus.income }
            )}
            {section('COMING LATER', later, (b) => ({ text: `Next ${shortDate(nextDue(b).date)}`, color: Corpus.textMuted }))}
            {section('🎉 COMPLETED', completed, (b) => ({ text: `All payments done · last one ${endLabel(b)}`, color: Corpus.income }))}
            {section('PAUSED', paused, () => ({ text: 'Paused — not logged or reserved', color: Corpus.textFaint }))}

            <Text style={styles.note}>
              Fixed bills are recorded automatically on their due day; variable ones wait for your
              amount. Until a bill is paid, its money is kept aside in Safe-to-Spend.
            </Text>
          </>
        )}
      </ScrollView>

      <BillSheet mode={mode} onClose={() => setMode(null)} onSave={save} onDelete={remove} />
      <PayBillSheet bill={paying} onClose={() => setPaying(null)} onPay={pay} onSkip={skip} />
    </SafeAreaView>
  );
}

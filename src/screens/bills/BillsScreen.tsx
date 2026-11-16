import Bullet from '@/components/charts/Bullet';
import Shine from '@/components/fx/Shine';
import { Button, Group, IconChip, Screen } from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntrance } from '@/hooks/useEntrance';
import { useTween } from '@/hooks/useTween';
import { accountBalances, accountTotals } from '@/utils/accounts';
import { Chip, Corpus } from '@/constants/theme';
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
  thisMonthBills,
  yearlyCost,
  upcomingBills,
  unpaidThisMonth,
  yearlyBillsTotal,
  yearMonth,
} from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { loanStatus } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import BillCalendar from './components/BillCalendar';
import BillRow from './components/BillRow';
import BillSheet, { BILL_TEMPLATES, type BillSheetMode } from './components/BillSheet';
import PayBillSheet from './components/PayBillSheet';
import { styles } from './BillsScreen.styles';

const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function whenText(daysAway: number) {
  if (daysAway < 0) return `${-daysAway} day${daysAway === -1 ? '' : 's'} late`;
  if (daysAway === 0) return 'Due today';
  if (daysAway === 1) return 'Due tomorrow';
  return `Due in ${daysAway} days`;
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
    .reduce((s, b) => s + yearlyCost(b), 0);

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

  const openBill = (b: Bill) => router.push(`/bill/${b.id}` as Href);

  // ── Actions ──
  const save = async (bill: NewBill, paidThisMonth: boolean) => {
    try {
      if (mode?.kind === 'edit') {
        await updateBill(mode.bill.id, bill);
        showToast({ message: `${bill.name} saved` });
      } else {
        await addBill(paidThisMonth ? { ...bill, lastLoggedMonth: yearMonth(new Date()) } : bill);
        showToast({ message: `${bill.name} added` });
      }
      setMode(null);
    } catch (e) {
      console.error('Save bill failed:', e);
      showToast({ message: 'Couldn’t save the bill. Try again.' });
    }
  };

  const remove = async (bill: Bill) => {
    try {
      await deleteBill(bill.id);
      setMode(null);
      showToast({ message: `${bill.name} deleted` });
    } catch (e) {
      console.error('Delete bill failed:', e);
      showToast({ message: 'Couldn’t delete. Try again.' });
    }
  };

  const pay = async (bill: Bill, amount: number, paidOn: Date) => {
    try {
      await logBillForThisMonth(bill, amount, new Date(), paidOn);
      setPaying(null);
      showToast({
        message: `${bill.name} paid, ${formatINR(amount)}`,
        actionLabel: 'Undo',
        onAction: () => undoBillPayment(bill),
      });
    } catch (e) {
      console.error('Pay bill failed:', e);
      showToast({ message: 'Couldn’t record the payment. Try again.' });
    }
  };

  const skip = async (bill: Bill) => {
    try {
      await skipBillThisMonth(bill);
      setPaying(null);
      showToast({ message: `${bill.name} skipped`, actionLabel: 'Undo', onAction: () => restoreBillState(bill) });
    } catch (e) {
      console.error('Skip bill failed:', e);
      showToast({ message: 'Couldn’t skip. Try again.' });
    }
  };

  // ── Cash context: can you cover what's coming? ──
  const { accounts } = useAccounts();
  const have = accounts.length ? accountTotals(accountBalances(accounts, yearTx)).have : null;
  const week = upcomingBills(bills, 7).filter(({ bill }) => dueThisMonth(bill) && !isPaidThisMonth(bill));
  const weekTotal = week.reduce((s, x) => s + x.bill.amount, 0);
  const short = have !== null && weekTotal > have;
  const t = useEntrance(800, loading);
  const paidV = useTween(loading ? 0 : paidAmount);
  const monthName = now.toLocaleDateString('en-IN', { month: 'long' });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const rail = thisMonthBills(bills, now);
  const maxAmt = Math.max(...rail.map((r) => r.bill.amount), 1);

  const group = (
    title: string,
    list: Bill[],
    status: (b: Bill) => { text: string; color?: string; icon?: string },
    action?: (b: Bill) => { label: string; filled?: boolean; onPress: () => void } | undefined
  ) =>
    list.length > 0 && (
      <Group animate title={title}>
        {list.map((b) => <BillRow key={b.id} bill={b} status={status(b)} action={action?.(b)} onOpen={() => openBill(b)} />)}
      </Group>
    );

  return (
    <>
      <Screen title="Bills" subtitle="Rent, EMIs and anything that repeats" right={bills.length > 0 ? <Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} /> : undefined}>
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading bills" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 230 }]} />
            <View style={[styles.skel, { height: 300 }]} />
          </View>
        ) : bills.length === 0 ? (
          <View style={styles.empty}>
            <IconChip icon="repeat" color={Chip.red} size={44} />
            <Text style={styles.emptyTitle}>Never type your rent again</Text>
            <Text style={styles.emptyText}>Add costs that repeat. Corpus records fixed ones on their due day, asks you for ones that change like electricity, and keeps the money aside until then.</Text>
            <View style={styles.templates}>
              {[...BILL_TEMPLATES.map((tp) => ({ key: tp.name, label: tp.name, icon: tp.icon, go: () => setMode({ kind: 'new', template: tp }) })), { key: 'other', label: 'Something else', icon: 'add', go: () => setMode({ kind: 'new' }) }].map((x) => (
                <Pressable key={x.key} style={({ pressed }) => [styles.template, pressed && { opacity: 0.7 }]} onPress={x.go} accessibilityRole="button">
                  <Ionicons name={x.icon as keyof typeof Ionicons.glyphMap} size={15} color={Corpus.text} />
                  <Text style={styles.templateText}>{x.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Shine />
              <Text style={styles.label}>Paid in {monthName}</Text>
              <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(paidV))}</Text>
              <Text style={styles.sub}>
                {dueTotal === 0 ? 'Nothing due this month' : unpaid > 0 ? `of ${formatINR(dueTotal)}. ${formatINR(unpaid)} still to pay` : `All ${formatINR(dueTotal)} paid for this month`}
              </Text>

              {rail.length > 0 && (
                <View style={styles.railWrap} accessible accessibilityLabel={`${rail.filter((r) => r.paid).length} of ${rail.length} bills paid this month`}>
                  <View style={styles.rail}>
                    <View style={styles.railLine} />
                    <View style={[styles.railDone, { width: `${((now.getDate() - 1) / (daysInMonth - 1)) * 100 * t}%` }]} />
                    {rail.map((r) => {
                      const size = 10 + Math.round((r.bill.amount / maxAmt) * 10);
                      const late = !r.paid && r.date.getDate() < now.getDate();
                      return (
                        <View key={r.bill.id} style={[styles.railDot, { left: `${((r.date.getDate() - 1) / (daysInMonth - 1)) * 100}%`, width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2,
                          backgroundColor: r.paid ? Corpus.income : late ? Corpus.danger : Corpus.card, borderColor: r.paid ? Corpus.income : late ? Corpus.danger : Corpus.text }]} />
                      );
                    })}
                    <View style={[styles.today, { left: `${((now.getDate() - 1) / (daysInMonth - 1)) * 100}%` }]} />
                  </View>
                  <View style={styles.railEnds}>
                    <Text style={styles.railText}>1 {monthName.slice(0, 3)}</Text>
                    <Text style={styles.railText}>Filled: paid. Hollow: to pay</Text>
                    <Text style={styles.railText}>{daysInMonth}</Text>
                  </View>
                </View>
              )}

              <View style={styles.strip}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>A usual month</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(monthly))}</Text>
                </View>
                <View style={[styles.stat, styles.statRule]}>
                  <Text style={styles.statLabel}>A year</Text>
                  <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(yearly))}</Text>
                </View>
              </View>
            </View>

            {weekTotal > 0 && (
              <View style={[styles.card, short && styles.cardWarn]}>
                <View style={styles.notice}>
                  <Ionicons name={short ? 'alert-circle' : 'calendar'} size={18} color={short ? Corpus.warning : Corpus.text} />
                  <Text style={styles.noticeText}>
                    <Text style={styles.strong}>{formatINR(weekTotal)}</Text> is due in the next 7 days ({week.map((x) => x.bill.name).slice(0, 3).join(', ')}{week.length > 3 ? ` and ${week.length - 3} more` : ''}).
                    {have !== null ? (short ? ` You have ${formatINR(have)} in your accounts, ${formatINR(weekTotal - have)} short.` : ` You have ${formatINR(have)}, so it’s covered.`) : ''}
                  </Text>
                </View>
              </View>
            )}

            {ratio !== null && (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} accessibilityRole="header">Share of your income</Text>
                  <Text style={[styles.cardSide, ratio > 50 && { color: Corpus.warning }]}>{ratio}%</Text>
                </View>
                <Bullet value={Math.min(ratio, 100)} limit={100} pace={0.5} color={ratio > 50 ? Corpus.warning : Corpus.income} height={10} appear={t} />
                <Text style={styles.rowNote}>
                  {ratio <= 50 ? 'Healthy. The tick marks 50%, a common upper limit for fixed costs.' : 'Above 50%, the common upper limit for fixed costs (the tick). Worth reviewing subscriptions.'}
                  {subscriptionsYearly > 0 ? ` Entertainment subscriptions cost ${formatINR(subscriptionsYearly)} a year.` : ''}
                </Text>
              </View>
            )}

            {loans.length > 0 && (
              <View style={styles.card}>
                <View style={styles.notice}>
                  <IconChip icon="document-text" color={Chip.orange} />
                  <Text style={styles.noticeText}>
                    You owe <Text style={styles.strong}>{formatINR(Math.round(totalOwed))}</Text> across {loans.length} loan{loans.length === 1 ? '' : 's'}, with {formatINR(Math.round(interestAhead))} of interest still ahead. Open a loan to see how paying early cuts it.
                  </Text>
                </View>
              </View>
            )}

            {group('Needs your amount', attention,
              (b) => ({ text: `Due ${shortDate(nextDue(b).date)}. Enter this month’s amount`, color: Corpus.warning, icon: 'create' }),
              (b) => ({ label: 'Enter', filled: true, onPress: () => setPaying(b) }))}
            {group('Due this week', thisWeek,
              (b) => { const d = nextDue(b).daysAway; return { text: `${whenText(d)}, ${shortDate(nextDue(b).date)}`, color: d < 0 ? Corpus.danger : d <= 1 ? Corpus.warning : undefined, icon: d < 0 ? 'alert-circle' : d <= 1 ? 'time' : undefined }; },
              (b) => ({ label: 'Pay', filled: nextDue(b).daysAway <= 1, onPress: () => setPaying(b) }))}
            {group('Later this month', laterThisMonth,
              (b) => ({ text: `${whenText(nextDue(b).daysAway)}, ${shortDate(nextDue(b).date)}` }),
              (b) => ({ label: 'Pay', onPress: () => setPaying(b) }))}

            <BillCalendar bills={bills} onOpen={openBill} onPay={setPaying} />

            {group('Paid this month', paid, (b) =>
              isSkippedThisMonth(b)
                ? { text: `Skipped. Next ${shortDate(nextDue(b).date)}`, icon: 'remove-circle-outline' }
                : { text: `Paid. Next ${shortDate(nextDue(b).date)}`, color: Corpus.income, icon: 'checkmark-circle' })}
            {group('Coming later', later, (b) => ({ text: `Next ${shortDate(nextDue(b).date)}` }))}
            {group('Finished', completed, (b) => ({ text: `All payments done. Last one ${endLabel(b)}`, color: Corpus.income, icon: 'checkmark-done' }))}
            {group('Paused', paused, () => ({ text: 'Paused. Not recorded or kept aside', icon: 'pause' }))}

            <Text style={styles.note}>Bills set to record themselves are added on their due day. The rest wait until you mark them paid, and stay here as late if you miss one. Until a bill is paid, its money is kept out of Safe to spend.</Text>
          </>
        )}
      </Screen>

      <BillSheet mode={mode} onClose={() => setMode(null)} onSave={save} onDelete={remove} />
      <PayBillSheet bill={paying} onClose={() => setPaying(null)} onPay={pay} onSkip={skip} />
    </>
  );
}

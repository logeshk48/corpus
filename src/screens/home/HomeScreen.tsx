import { Corpus } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { useBills } from '@/hooks/useBills';
import { useIous } from '@/hooks/useIous';
import { useAccounts } from '@/hooks/useAccounts';
import { accountBalances, accountTotals, cardReminders, verifiedAgo } from '@/utils/accounts';
import { moneyHealth } from '@/utils/moneyHealth';
import { useAssets } from '@/hooks/useAssets';
import { useGoldRate } from '@/hooks/useGoldRate';
import { useInvestments } from '@/hooks/useInvestments';
import { netWorthItems, netWorthTotals } from '@/utils/netWorth';
import { byPerson, totals } from '@/utils/iou';
import { chainNudges } from '@/utils/debts';
import { actionable, moneyReminders } from '@/utils/debtReminders';
import MoneyReminders from './components/MoneyReminders';
import UpcomingBills from './components/UpcomingBills';
import BillAlerts from './components/BillAlerts';
import PayBillSheet from '@/screens/bills/components/PayBillSheet';
import { logBillForThisMonth, skipBillThisMonth, restoreBillState, undoBillPayment } from '@/services/bills';
import { useToast } from '@/context/ToastContext';
import type { Bill } from '@/types/bill';
import { overallBudget } from '@/utils/budgets';
import { computeSafeToSpend } from '@/utils/safeToSpend';
import { catchUp } from '@/utils/catchUp';
import { frequentPicks, type QuickPick } from '@/utils/quickAdd';
import { addTransactionNow, deleteTransaction } from '@/services/transactions';
import QuickAdd from './components/QuickAdd';
import Shortcuts, { type Shortcut } from './components/Shortcuts';
import { compactINR } from '@/utils/format';
import CatchUpCard from './components/CatchUpCard';
import { unpaidThisMonth } from '@/utils/bills';
import { useState } from 'react';
import SafeToSpendSheet from './components/SafeToSpendSheet';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, type Href } from 'expo-router';
import HeroCard from './components/HeroCard';
import HomeHeader from './components/HomeHeader';
import TransactionRow from './components/TransactionRow';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  const router = useRouter();
  const { transactions, loading, error } = useTransactions('month');
  const { settings } = useSettings();
  const { vaults, total: jarsTotal, loading: jarsLoading } = useVaults();
  const { ious } = useIous();
  const { accounts } = useAccounts();
  // balances come from check-ins; tagged entries since then (rare) still count
  const accList = accountBalances(accounts, transactions);
  const accStale = accList.some((a) => verifiedAgo(a).stale);
  const iouTotals = totals(byPerson(ious));
  const repayNudge = chainNudges(ious)[0];
  const { bills } = useBills();
  const accTotals = accountTotals(accList);
  const health = accounts.length ? moneyHealth(accTotals.have, accTotals.cardDues, bills, transactions) : null;
  const shortAlert = health?.short
    ? [{ id: 'short', iouId: '', when: new Date(), title: `${formatINR(-health.free)} short for bills & card dues`, body: `You have ${formatINR(health.have)}, but ${formatINR(health.billsDue + health.cardDues)} is due in the next 30 days`, urgency: 'overdue' as const }]
    : [];
  const reminders = actionable([...shortAlert, ...moneyReminders(ious), ...cardReminders(accList)]);
  const [showSafe, setShowSafe] = useState(false);
  const { showToast } = useToast();
  const [paying, setPaying] = useState<Bill | null>(null);

  const payBill = async (bill: Bill, amount: number) => {
    try {
      await logBillForThisMonth(bill, amount);
      setPaying(null);
      showToast({ message: `${bill.name} ${formatINR(amount)} recorded`, actionLabel: 'Undo', onAction: () => undoBillPayment(bill) });
    } catch (e) {
      console.error('Pay bill failed:', e);
      showToast({ message: 'Could not record the payment. Try again.' });
    }
  };
  const skipBill = async (bill: Bill) => {
    try {
      await skipBillThisMonth(bill);
      setPaying(null);
      showToast({ message: `${bill.name} skipped this month`, actionLabel: 'Undo', onAction: () => restoreBillState(bill) });
    } catch (e) {
      console.error('Skip bill failed:', e);
      showToast({ message: 'Could not skip. Try again.' });
    }
  };

  // The heart of Corpus: how much can I safely spend today?
  const { transactions: yearTx } = useTransactions('last12Months');
  const picks = frequentPicks(yearTx, 'expense', new Date(), 4);
  const behind = catchUp(yearTx);

  // One tap on Home logs it — the fastest path there is
  const quickLog = async (p: QuickPick) => {
    const id = addTransactionNow({ type: 'expense', amount: p.amount, category: p.category, note: p.note || undefined, date: new Date().toISOString() });
    showToast({
      message: `${p.note || 'Expense'} ${formatINR(p.amount)} logged`,
      actionLabel: 'Undo',
      onAction: () => deleteTransaction(id),
    });
  };

  const safe = computeSafeToSpend({
    monthTransactions: transactions,
    jars: vaults,
    monthlyBudget: settings.monthlyBudget,
    billsDue: unpaidThisMonth(bills),
    setAside: settings.setAside,
    cycleStartDay: settings.cycleStartDay,
  });

  // Real budgets: overall month + the 3 categories closest to their limit
  const overall = overallBudget(transactions, settings.monthlyBudget);

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const spent = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Today is always inside this month, so filter the month's list — no extra query
  const todayRange = getRange('today');
  const spentToday = transactions
    .filter((t) => t.type === 'expense' && isInRange(t.date, todayRange))
    .reduce((sum, t) => sum + t.amount, 0);

  const recent = transactions.slice(0, 5);

  const accHave = accountTotals(accList).have;
  const { assets } = useAssets();
  const gold = useGoldRate();
  const { investments } = useInvestments();
  const nw = netWorthTotals(netWorthItems({ accounts: accList, ious, bills, assets, investments, goldRate: gold.rate ? { rate: gold.rate, mode: gold.mode } : null })).total;
  const budgetPct = overall && overall.limit > 0 ? Math.round((overall.spent / overall.limit) * 100) : null;
  const shortcuts: Shortcut[] = [
    {
      key: 'accounts', label: 'Accounts', icon: 'wallet-outline',
      value: accounts.length === 0 ? 'Add cash & bank' : accStale ? 'Update balances' : `${compactINR(accHave)} you have`,
      tone: accStale ? 'warn' : 'normal',
      onPress: () => router.push('/accounts' as Href),
    },
    {
      key: 'budgets', label: 'Budgets', icon: 'pie-chart-outline',
      value: budgetPct === null ? 'Set a limit' : `${budgetPct}% used`,
      tone: budgetPct === null ? 'normal' : budgetPct > 100 ? 'danger' : budgetPct > 80 ? 'warn' : 'good',
      onPress: () => router.push('/budgets' as Href),
    },
    {
      key: 'people', label: 'People', icon: 'swap-horizontal',
      value: repayNudge
        ? `Repay ${repayNudge.borrowed.person}`
        : iouTotals.toGet > 0 ? `${compactINR(iouTotals.toGet)} to get`
        : iouTotals.toPay > 0 ? `${compactINR(iouTotals.toPay)} to pay` : 'All square',
      tone: repayNudge ? 'warn' : 'normal',
      onPress: () => router.push('/ious' as Href),
    },
    {
      key: 'jars', label: 'Jars', icon: 'file-tray-stacked-outline',
      value: vaults.length > 0 ? `${compactINR(jarsTotal)} saved` : 'Start saving',
      onPress: () => router.push('/vaults' as Href),
    },
    {
      key: 'income', label: 'Income', icon: 'git-branch-outline',
      value: income > 0 ? `${compactINR(income)} this month` : 'Add income',
      tone: income > 0 ? 'good' : 'normal',
      onPress: () => router.push('/income' as Href),
    },
    {
      key: 'networth', label: 'Net worth', icon: 'trending-up-outline',
      value: accounts.length === 0 && assets.length === 0 ? 'See it all' : compactINR(nw),
      tone: accounts.length === 0 && assets.length === 0 ? 'normal' : nw < 0 ? 'danger' : 'good',
      onPress: () => router.push('/networth' as Href),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <BillAlerts
          bills={bills}
          onPay={(b) => setPaying(b)}
          onOpen={(b) => router.push(`/bill/${b.id}` as Href)}
        />
        <HeroCard result={safe} loading={loading || jarsLoading} onPress={() => setShowSafe(true)} />

        <QuickAdd picks={picks} onLog={quickLog} onMore={() => router.push('/add' as Href)} />

        {behind && <CatchUpCard data={behind} onPress={() => router.push(`/add?catchup=1` as Href)} />}
        <MoneyReminders items={reminders} onPress={() => router.push('/ious' as Href)} />

        <UpcomingBills bills={bills} onPress={() => router.push('/bills' as Href)} />

        <Shortcuts items={shortcuts} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitleInline}>Recent</Text>
          <Link href="/transactions">
            <Text style={styles.viewAll}>View all</Text>
          </Link>
        </View>
        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : recent.length === 0 ? (
          <Text style={styles.emptyText}>
            No transactions this month yet. Tap the gold + to add one.
          </Text>
        ) : (
          <View style={styles.recentList}>
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onPress={() => router.push({ pathname: '/edit/[id]', params: { id: tx.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <SafeToSpendSheet visible={showSafe} result={safe} onClose={() => setShowSafe(false)} />
      <PayBillSheet bill={paying} onClose={() => setPaying(null)} onPay={payBill} onSkip={skipBill} />
    </SafeAreaView>
  );
}
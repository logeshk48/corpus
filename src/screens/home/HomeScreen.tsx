import { Corpus } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { useBills } from '@/hooks/useBills';
import UpcomingBills from './components/UpcomingBills';
import BillAlerts from './components/BillAlerts';
import PayBillSheet from '@/screens/bills/components/PayBillSheet';
import { logBillForThisMonth, skipBillThisMonth, restoreBillState, undoBillPayment } from '@/services/bills';
import { useToast } from '@/context/ToastContext';
import type { Bill } from '@/types/bill';
import { buildBudgetStatuses, overallBudget } from '@/utils/budgets';
import { computeSafeToSpend } from '@/utils/safeToSpend';
import { unpaidThisMonth } from '@/utils/bills';
import { useState } from 'react';
import SafeToSpendSheet from './components/SafeToSpendSheet';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, type Href } from 'expo-router';
import BudgetBar from './components/BudgetBar';
import HeroCard from './components/HeroCard';
import HomeHeader from './components/HomeHeader';
import StatCard from './components/StatCard';
import TransactionRow from './components/TransactionRow';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  const router = useRouter();
  const { transactions, loading, error } = useTransactions('month');
  const { settings } = useSettings();
  const { vaults, total: jarsTotal, loading: jarsLoading } = useVaults();
  const [showSafe, setShowSafe] = useState(false);
  const { bills } = useBills();
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
  const safe = computeSafeToSpend({
    monthTransactions: transactions,
    jars: vaults,
    monthlyBudget: settings.monthlyBudget,
    billsDue: unpaidThisMonth(bills),
  });

  // Real budgets: overall month + the 3 categories closest to their limit
  const overall = overallBudget(transactions, settings.monthlyBudget);
  const topBudgets = buildBudgetStatuses(transactions, settings.categoryBudgets).slice(0, 3);
  const hasBudgets = overall !== null || topBudgets.length > 0;

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
        <View style={styles.statsRow}>
          <StatCard label="Spent today" value={formatINR(spentToday)} />
          <StatCard label="Month income" value={formatINR(income)} />
          <StatCard label="Month spent" value={formatINR(spent)} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/income' as Href)}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="git-branch-outline" size={16} color={Corpus.income} />
          </View>
          <Text style={styles.linkText}>Income streams</Text>
          <Ionicons name="chevron-forward" size={16} color={Corpus.textMuted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/vaults')}
        >
          <View style={[styles.linkIcon, styles.linkIconGold]}>
            <Ionicons name="file-tray-stacked-outline" size={16} color={Corpus.gold} />
          </View>
          <Text style={styles.linkText}>Vaults</Text>
          <Text style={styles.linkValue}>
            {vaults.length > 0 ? `${formatINR(jarsTotal)} in jars` : 'Start a jar'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Corpus.textMuted} />
        </Pressable>

        <UpcomingBills bills={bills} onPress={() => router.push('/bills' as Href)} />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitleInline}>Budgets</Text>
          <Pressable onPress={() => router.push('/budgets')} hitSlop={8}>
            <Text style={styles.viewAll}>{hasBudgets ? 'Manage' : 'Set up'}</Text>
          </Pressable>
        </View>
        {hasBudgets ? (
          <Pressable
            style={({ pressed }) => [styles.budgets, pressed && { opacity: 0.7 }]}
            onPress={() => router.push('/budgets')}
          >
            {overall && (
              <BudgetBar label="Whole month" spent={overall.spent} total={overall.limit} />
            )}
            {topBudgets.map((b) => (
              <BudgetBar key={b.categoryId} label={b.label} spent={b.spent} total={b.limit} />
            ))}
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/budgets')}>
            <Text style={styles.emptyText}>
              No budgets yet. Set monthly limits to see how your spending is tracking.
            </Text>
          </Pressable>
        )}

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
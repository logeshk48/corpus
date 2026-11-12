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
import { scoreInputs } from '@/utils/wealthInputs';
import { wealthScore } from '@/utils/wealthScore';
import WealthScoreCard from './components/WealthScoreCard';
import DebtPlanCard from './components/DebtPlanCard';
import { debtPlanSummary, planStart } from '@/utils/debtPlan';
import { saveCategoryBudgets, saveSettings } from '@/services/settings';
import { byPerson, totals } from '@/utils/iou';
import { chainNudges } from '@/utils/debts';
import { actionable, moneyReminders } from '@/utils/debtReminders';
import MoneyReminders from './components/MoneyReminders';
import UpcomingBills from './components/UpcomingBills';
import BillAlerts from './components/BillAlerts';
import PayBillSheet from '@/screens/bills/components/PayBillSheet';
import { addBill, deleteBill, logBillForThisMonth, skipBillThisMonth, restoreBillState, undoBillPayment } from '@/services/bills';
import InsightsCard, { type Insight } from './components/InsightsCard';
import MonthReportCard from './components/MonthReportCard';
import { lastMonthKey, monthReport } from '@/utils/monthReport';
import { findCategory } from '@/constants/categories';
import { findings } from '@/utils/insights';
import { addVault, deleteVault } from '@/services/vaults';
import { VAULT_COLORS, VAULT_ICONS } from '@/types/vault';
import { futureValue } from '@/utils/returns';
import { useToast } from '@/context/ToastContext';
import type { Bill } from '@/types/bill';
import { overallBudget } from '@/utils/budgets';
import { computeSafeToSpend, cycleBounds } from '@/utils/safeToSpend';
import { nextSip, sipInvested, sipsDueBefore, sipReminders } from '@/utils/sip';
import { catchUp } from '@/utils/catchUp';
import { frequentPicks, type QuickPick } from '@/utils/quickAdd';
import { addTransactionNow, deleteTransaction, restoreTransaction, updateTransaction } from '@/services/transactions';
import QuickAdd from './components/QuickAdd';
import Shortcuts, { type Shortcut } from './components/Shortcuts';
import { compactINR } from '@/utils/format';
import CatchUpCard from './components/CatchUpCard';
import { unpaidThisMonth } from '@/utils/bills';
import { useEffect, useState } from 'react';
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
  const { settings, loading: settingsLoading } = useSettings();
  const { vaults, total: jarsTotal, loading: jarsLoading } = useVaults();
  const { ious } = useIous();
  const { accounts } = useAccounts();
  // balances come from check-ins; tagged entries since then (rare) still count
  const accList = accountBalances(accounts, transactions);
  const accStale = accList.some((a) => verifiedAgo(a).stale);
  const iouTotals = totals(byPerson(ious));
  const repayNudge = chainNudges(ious)[0];
  const { bills } = useBills();
  const { investments } = useInvestments();
  const cyc = cycleBounds(new Date(), settings.cycleStartDay);
  const sipThisCycle = sipInvested(investments, cyc.start) + sipsDueBefore(investments, cyc.end);
  const investedThisMonth = sipInvested(investments, cyc.start);
  const nextSipAll = investments.map((h) => nextSip(h)).filter(Boolean).sort((a, b) => a!.date.getTime() - b!.date.getTime())[0] ?? null;
  const accTotals = accountTotals(accList);
  const health = accounts.length ? moneyHealth(accTotals.have, accTotals.cardDues, bills, transactions) : null;
  const shortAlert = health?.short
    ? [{ id: 'short', iouId: '', when: new Date(), title: `${formatINR(-health.free)} short for bills & card dues`, body: `You have ${formatINR(health.have)}, but ${formatINR(health.billsDue + health.cardDues)} is due in the next 30 days`, urgency: 'overdue' as const }]
    : [];
  // Debt plan (Day 6): progress, monthly "did you pay the extra?", cleared celebrations
  const debtPlan = debtPlanSummary({ ious, bills, accounts: accList, plan: settings.debtPlan, cycleStartDay: settings.cycleStartDay });
  const dp = settings.debtPlan ?? { strategy: 'avalanche' as const, extra: 0 };
  useEffect(() => {
    // start measuring progress the first time you have debts and a plan
    if (!settingsLoading && debtPlan.list.length && !dp.startedAt) saveSettings({ debtPlan: { ...dp, ...planStart(debtPlan.list) } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, debtPlan.list.length, dp.startedAt]);
  const answerExtra = (a: 'paid' | 'skipped') =>
    saveSettings({ debtPlan: { ...dp, log: { ...(dp.log ?? {}), [debtPlan.cycleKey]: a } } }).then(() =>
      showToast({ message: a === 'paid' ? `Nice — ${debtPlan.streak + 1 > 1 ? `${debtPlan.streak + 1} months in a row` : 'plan on track'}` : 'Okay — next month then' })
    );
  const seenCleared = (ids: string[]) => saveSettings({ debtPlan: { ...dp, seenCleared: [...(dp.seenCleared ?? []), ...ids] } }).catch(() => {});
  const reminders = actionable([...shortAlert, ...sipReminders(investments), ...moneyReminders(ious), ...cardReminders(accList)]);
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

  // Smart detection (Day 7): things Corpus noticed, each with a one-tap action
  const dismissed = settings.dismissedInsights ?? [];
  const dismiss = (key: string) => saveSettings({ dismissedInsights: [...dismissed, key] }).catch(() => {});
  const thisYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const insights: Insight[] = findings({ tx: yearTx, bills, dismissed, budgets: settings.categoryBudgets, cycleStartDay: settings.cycleStartDay }).map((f): Insight => {
    if (f.kind === 'leak') {
      const l = f.l;
      const half = Math.round(l.monthly / 2);
      const grows = Math.round(futureValue(0, half, 12, 120) / 1000) * 1000;
      return {
        key: l.key,
        icon: 'water-outline',
        tone: 'gold',
        title: `${l.name}: ${formatINR(l.yearly)} a year`,
        body: `About ${formatINR(l.avg)} each, ${l.perWeek} times a week — ${formatINR(l.monthly)} a month. Not wrong, just worth seeing. Halving it saves ${formatINR(half * 12)} a year; invested instead, that’s about ${formatINR(grows)} in 10 years.`,
        yes: {
          label: `Save ${formatINR(half)}/month in a jar`,
          run: async () => {
            const by = new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1);
            const id = await addVault({
              name: `Saved on ${l.name}`, icon: VAULT_ICONS.includes('leaf') ? 'leaf' : VAULT_ICONS[0], color: VAULT_COLORS[2] ?? VAULT_COLORS[0], kind: 'savings',
              goal: half * 12, targetDate: `${by.getFullYear()}-${String(by.getMonth() + 1).padStart(2, '0')}`,
            });
            showToast({ message: `Jar “Saved on ${l.name}” · ${formatINR(half)} a month`, actionLabel: 'Undo', onAction: () => deleteVault(id) });
          },
        },
        no: { label: 'Worth it', run: async () => dismiss(l.key) },
      };
    }
    if (f.kind === 'payday') {
      const { s: sal, suggest } = f;
      const th = (d: number) => `${d}${d === 1 || d === 21 ? 'st' : d === 2 || d === 22 ? 'nd' : d === 3 || d === 23 ? 'rd' : 'th'}`;
      return {
        key: `pay:${suggest}`,
        icon: 'calendar-outline',
        tone: 'gold',
        title: `Your salary comes around the ${th(sal.day)}`,
        body: `${formatINR(sal.amount)} on about the ${th(sal.day)}, ${sal.months} months running. Your money month starts on the ${th(settings.cycleStartDay ?? 1)} now, so safe-to-spend splits your salary across two months. Start it on pay day${sal.day >= 29 ? ' (the 1st, since your pay lands at month end)' : ''} and your daily amount matches the money you actually have.`,
        yes: {
          label: `Start my month on the ${th(suggest)}`,
          run: async () => {
            const before = settings.cycleStartDay;
            await saveSettings({ cycleStartDay: suggest });
            showToast({ message: `Your month now starts on the ${th(suggest)}`, actionLabel: 'Undo', onAction: () => saveSettings({ cycleStartDay: before ?? 1 }) });
          },
        },
        no: { label: 'Keep as is', run: async () => dismiss(`pay:${suggest}`) },
      };
    }
    if (f.kind === 'late') {
      const { s: sal } = f;
      const key = `late:${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
      return {
        key,
        icon: 'cash-outline',
        tone: 'warn',
        title: `Salary not logged yet this month`,
        body: `It usually comes around the ${sal.day}${sal.day === 1 ? 'st' : sal.day === 2 ? 'nd' : sal.day === 3 ? 'rd' : 'th'} (${formatINR(sal.amount)}) — that was ${sal.lateBy} days ago. If it’s in, log it so safe-to-spend and your budget are right. If it’s late, safe-to-spend stays cautious until it arrives.`,
        yes: {
          label: `Log ${formatINR(sal.amount)} salary`,
          run: async () => {
            const id = addTransactionNow({ type: 'income', amount: sal.amount, category: sal.category, ...(sal.streamId ? { streamId: sal.streamId } : {}), note: sal.note || 'Salary', date: new Date().toISOString() });
            showToast({ message: `${formatINR(sal.amount)} salary logged`, actionLabel: 'Undo', onAction: () => deleteTransaction(id) });
          },
        },
        no: { label: 'Not yet', run: async () => dismiss(key) },
      };
    }
    if (f.kind === 'big') {
      const { t, usual, times, typo } = f.b;
      const label = findCategory('expense', t.category)?.label ?? 'Expense';
      const when = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return {
        key: f.b.key,
        icon: typo ? 'alert-circle-outline' : 'trending-up-outline',
        tone: 'warn',
        title: typo ? `${formatINR(t.amount)} ${t.note || label} — extra zero?` : `${formatINR(t.amount)} on ${t.note || label}`,
        body: typo
          ? `On ${when}. You usually spend about ${formatINR(usual)} on ${label.toLowerCase()} — did you mean ${formatINR(typo)}? A wrong amount throws off your budget and safe-to-spend.`
          : `On ${when}, about ${times}× your usual ${label.toLowerCase()} spend of ${formatINR(usual)}. Big one-offs are fine — just make sure the amount is right.`,
        yes: typo
          ? {
              label: `Change to ${formatINR(typo)}`,
              run: async () => {
                await updateTransaction(t.id, { amount: typo });
                showToast({ message: `Changed to ${formatINR(typo)}`, actionLabel: 'Undo', onAction: () => updateTransaction(t.id, { amount: t.amount }) });
              },
            }
          : { label: 'Edit it', run: async () => router.push(`/edit/${t.id}` as Href) },
        no: { label: 'It’s right', run: async () => dismiss(f.b.key) },
      };
    }
    if (f.kind === 'hot') {
      const h = f.h;
      const label = findCategory('expense', h.category)?.label ?? h.category;
      const limit = Math.max(500, Math.round(h.usual / 100) * 100);
      return {
        key: h.key,
        icon: 'flame-outline',
        tone: 'warn',
        title: `${label} is running high this month`,
        body:
          `${formatINR(h.spent)} so far — usually about ${formatINR(h.usualByNow)} by now. At this pace it ends near ${formatINR(h.projected)}, ${formatINR(h.projected - h.usual)} above your usual ${formatINR(h.usual)}.` +
          (h.spent >= h.usual
            ? ` You’ve already spent a usual month’s ${label.toLowerCase()} — keep it minimal for the last ${h.daysLeft} days.`
            : ` ${h.daysLeft} days left: about ${formatINR(Math.round((h.usual - h.spent) / h.daysLeft))} a day keeps it at your usual.`),
        yes: h.budget
          ? { label: `See ${label}`, run: async () => router.push(`/category/${h.category}` as Href) }
          : {
              label: `Set a ${formatINR(limit)} limit`,
              run: async () => {
                await saveCategoryBudgets({ ...(settings.categoryBudgets ?? {}), [h.category]: limit });
                showToast({ message: `${label} limit set to ${formatINR(limit)} a month` });
              },
            },
        no: { label: 'Fine this month', run: async () => dismiss(h.key) },
      };
    }
    if (f.kind === 'duplicate') {
      const { keep, drop } = f.d;
      const when = new Date(drop.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const label = findCategory(drop.type, drop.category)?.label ?? 'Entry';
      return {
        key: f.d.key,
        icon: 'copy-outline',
        tone: 'danger',
        title: `${formatINR(drop.amount)} ${drop.note || label} logged twice?`,
        body:
          f.d.reason === 'bill'
            ? `Corpus already logged your “${keep.note || label}” bill on ${new Date(keep.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, and you added it again on ${when}. Counting it twice makes your spending look ${formatINR(drop.amount)} higher.`
            : `Two identical ${drop.type === 'income' ? 'incomes' : 'expenses'} on ${when}, ${f.d.minutes <= 1 ? 'within a minute' : `${f.d.minutes} minutes apart`} — usually a double tap.`,
        yes: {
          label: 'Delete the extra one',
          run: async () => {
            const { id, ...rest } = drop;
            await deleteTransaction(id);
            showToast({ message: 'Extra entry deleted', actionLabel: 'Undo', onAction: () => restoreTransaction(id, rest) });
          },
        },
        no: { label: 'Both are real', run: async () => dismiss(f.d.key) },
      };
    }
    const r = f.r;
    const nth = r.day === 1 || r.day === 21 || r.day === 31 ? 'st' : r.day === 2 || r.day === 22 ? 'nd' : r.day === 3 || r.day === 23 ? 'rd' : 'th';
    return {
      key: r.key,
      icon: 'repeat-outline',
      tone: r.increase ? 'warn' : 'gold',
      title: `${r.name} · ${r.variable ? 'about ' : ''}${formatINR(r.amount)} every month`,
      body:
        `Paid ${r.months} months in a row, around the ${r.day}${nth}. That’s ${formatINR(r.yearly)} a year.` +
        (r.increase ? ` It went up by ${formatINR(r.increase)} recently — still worth it?` : '') +
        ' Make it a bill and Corpus logs it for you, keeps the money aside in safe-to-spend, and reminds you before it’s due.',
      yes: {
        label: 'Make it a bill',
        run: async () => {
          const id = await addBill({
            name: r.name, amount: r.amount, category: r.category, dayOfMonth: Math.min(31, Math.max(1, r.day)), active: true,
            startMonth: thisYm, frequency: 'monthly', ...(r.variable ? { variable: true } : {}),
            ...(r.paidThisMonth ? { lastLoggedMonth: thisYm } : {}), // already paid this month → don't log it again
          });
          showToast({ message: `${r.name} is now a bill`, actionLabel: 'Undo', onAction: () => deleteBill(id) });
        },
      },
      no: { label: r.increase ? 'Keep, not a bill' : 'Not a bill', run: async () => dismiss(r.key) },
    };
  });
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
    investing: sipThisCycle,
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
  const { assets, snapshots: nwSnaps } = useAssets();
  // First week of the month: last month's report (until you close it)
  const lmKey = lastMonthKey();
  const mReport = monthReport({ tx: yearTx, investments, month: lmKey, budget: settings.monthlyBudget, netWorth: nwSnaps, scoreLog: settings.scoreLog });
  const showMonth = new Date().getDate() <= 7 && mReport.hasData && !(settings.dismissedInsights ?? []).includes(`mreport:${lmKey}`);
  const gold = useGoldRate();
  const nwItems = netWorthItems({ accounts: accList, ious, bills, assets, investments, goldRate: gold.rate ? { rate: gold.rate, mode: gold.mode } : null });
  const nwTotals = netWorthTotals(nwItems);
  const nw = nwTotals.total;
  // Wealth Builder Score (Day 5)
  const wscore = wealthScore(scoreInputs({ tx: yearTx, investments, ious, bills, items: nwItems, totals: nwTotals, cardDues: accTotals.cardDues, hasAccounts: accounts.length > 0 }));
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
        {showMonth && (
          <MonthReportCard
            r={mReport}
            onOpen={() => router.push(`/analytics?month=${lmKey}` as Href)}
            onYear={() => router.push('/reports' as Href)}
            onClose={() => saveSettings({ dismissedInsights: [...(settings.dismissedInsights ?? []), `mreport:${lmKey}`] }).catch(() => {})}
          />
        )}

        <InsightsCard items={insights} />

        <MoneyReminders items={reminders} onPress={(r) => router.push((r?.href ?? (reminders.every((x) => x.href) ? reminders[0].href : '/ious')) as Href)} />

        <UpcomingBills bills={bills} onPress={() => router.push('/bills' as Href)} />

        <WealthScoreCard s={wscore} onPress={() => router.push('/wealth' as Href)} />

        <DebtPlanCard s={debtPlan} onOpen={() => router.push('/debts' as Href)} onAnswer={answerExtra} onSeenCleared={seenCleared} />

        <Shortcuts items={shortcuts} />

        {(investedThisMonth > 0 || nextSipAll) && (
          <Pressable style={styles.linkCard} onPress={() => router.push('/invest' as Href)}>
            <View style={[styles.linkIcon, styles.linkIconGold]}>
              <Ionicons name="trending-up" size={16} color={Corpus.gold} />
            </View>
            <Text style={styles.linkText}>
              {investedThisMonth > 0 ? `Invested ${formatINR(investedThisMonth)} this month` : 'SIPs'}
              {nextSipAll ? `  ·  next ${formatINR(nextSipAll.amount)} on ${nextSipAll.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
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
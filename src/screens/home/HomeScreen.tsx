import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import BudgetBar from './components/BudgetBar';
import HeroCard from './components/HeroCard';
import HomeHeader from './components/HomeHeader';
import StatCard from './components/StatCard';
import TransactionRow from './components/TransactionRow';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  const router = useRouter();
  const { transactions, loading, error } = useTransactions('month');

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
        <HeroCard />
        <View style={styles.statsRow}>
          <StatCard label="Spent today" value={formatINR(spentToday)} />
          <StatCard label="Month income" value={formatINR(income)} />
          <StatCard label="Month spent" value={formatINR(spent)} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/income')}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="git-branch-outline" size={16} color={Corpus.income} />
          </View>
          <Text style={styles.linkText}>Income streams</Text>
          <Ionicons name="chevron-forward" size={16} color={Corpus.textMuted} />
        </Pressable>

        <Text style={styles.sectionTitle}>Budgets</Text>
        <View style={styles.budgets}>
          <BudgetBar label="Food" spent={6200} total={8000} />
          <BudgetBar label="Travel" spent={3450} total={4000} />
          <BudgetBar label="Shopping" spent={4800} total={4000} />
        </View>

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
    </SafeAreaView>
  );
}
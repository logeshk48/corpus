import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import { formatINR } from '@/utils/format';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BudgetBar from './components/BudgetBar';
import HeroCard from './components/HeroCard';
import HomeHeader from './components/HomeHeader';
import StatCard from './components/StatCard';
import TransactionRow from './components/TransactionRow';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  const { transactions, loading, error } = useTransactions('month');

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const spent = transactions
    .filter((t) => t.type === 'expense')
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
          <StatCard label="Income this month" value={formatINR(income)} />
          <StatCard label="Spent this month" value={formatINR(spent)} />
        </View>

        <Text style={styles.sectionTitle}>Budgets</Text>
        <View style={styles.budgets}>
          <BudgetBar label="Food" spent={6200} total={8000} />
          <BudgetBar label="Travel" spent={3450} total={4000} />
          <BudgetBar label="Shopping" spent={4800} total={4000} />
        </View>

        <Text style={styles.sectionTitle}>Recent</Text>
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
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
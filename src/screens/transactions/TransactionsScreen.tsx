import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { groupByDay } from '@/utils/groupTransactions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './TransactionsScreen.styles';

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, loading, error } = useTransactions('year');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const sections = groupByDay(transactions);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Transactions</Text>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error}</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={32} color={Corpus.textFaint} />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>Add your first one from the gold + tab</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.list}>
                {section.data.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
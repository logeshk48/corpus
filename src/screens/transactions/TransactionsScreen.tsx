import { MOCK_TRANSACTIONS } from '@/constants/mockTransactions';
import { Corpus } from '@/constants/theme';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { groupByDay } from '@/utils/groupTransactions';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './TransactionsScreen.styles';

export default function TransactionsScreen() {
  const sections = groupByDay(MOCK_TRANSACTIONS);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Transactions</Text>

        {sections.length === 0 ? (
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
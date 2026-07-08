import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Transaction } from '@/constants/mockTransactions';
import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './TransactionRow.styles';

function getCategoryMeta(tx: Transaction) {
  const list = tx.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return list.find((c) => c.id === tx.category);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TransactionRow({ tx }: { tx: Transaction }) {
  const cat = getCategoryMeta(tx);
  const isIncome = tx.type === 'income';

  return (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={(cat?.icon ?? 'ellipsis-horizontal') as any}
          size={16}
          color={isIncome ? Corpus.income : Corpus.textMuted}
        />
      </View>
      <View style={styles.middle}>
        <Text style={styles.note}>{tx.note ?? cat?.label ?? 'Transaction'}</Text>
        <Text style={styles.meta}>
          {cat?.label} · {formatTime(tx.date)}
        </Text>
      </View>
      <Text style={[styles.amount, isIncome && styles.amountIncome]}>
        {isIncome ? '+' : ''}₹{tx.amount.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}
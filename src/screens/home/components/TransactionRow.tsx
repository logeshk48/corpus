import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './TransactionRow.styles';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

type TransactionRowProps = {
  tx: Transaction;
  onPress?: () => void;
};

export default function TransactionRow({ tx, onPress }: TransactionRowProps) {
  const cat = findCategory(tx.type, tx.category);
  const isIncome = tx.type === 'income';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
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
    </Pressable>
  );
}
import { IconChip } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { Pressable, Text, View } from 'react-native';
import { styles } from './TransactionRow.styles';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

// "Yesterday, 9:11 pm" or "Sat 22 Nov, 9:11 pm" when the row isn't from today
function dayAndTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const day = d.toDateString() === today.toDateString() ? '' : d.toDateString() === y.toDateString() ? 'Yesterday, ' : `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}, `;
  return day + formatTime(iso);
}

type TransactionRowProps = { tx: Transaction; onPress?: () => void; withDay?: boolean };

export default function TransactionRow({ tx, onPress, withDay }: TransactionRowProps) {
  const cat = findCategory(tx.type, tx.category);
  const when = withDay ? dayAndTime(tx.date) : formatTime(tx.date);
  const isIncome = tx.type === 'income';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} accessibilityRole={onPress ? 'button' : undefined}>
      <IconChip icon={cat?.icon ?? 'ellipsis-horizontal'} color={CategoryChip[tx.category] ?? Chip.gray} />
      <View style={styles.middle}>
        <Text style={styles.note} numberOfLines={1}>{tx.note ?? cat?.label ?? 'Transaction'}</Text>
        <Text style={styles.meta}>{tx.note ? `${cat?.label ?? ''}, ${when}` : when}</Text>
      </View>
      <Text style={[styles.amount, isIncome && styles.amountIncome]}>
        {isIncome ? '+' : '−'}₹{tx.amount.toLocaleString('en-IN')}
      </Text>
    </Pressable>
  );
}

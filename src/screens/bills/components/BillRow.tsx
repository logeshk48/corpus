import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { formatINR } from '@/utils/format';
import { endLabel, isPaidThisMonth, remainingPayments } from '@/utils/bills';
import { loanStatus } from '@/utils/loan';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './BillRow.styles';

type Props = {
  bill: Bill;
  status: { text: string; color: string };
  first: boolean;
  action?: { label: string; filled?: boolean; onPress: () => void };
  onOpen: () => void;
};

export default function BillRow({ bill, status, first, action, onOpen }: Props) {
  const cat = findCategory('expense', bill.category);
  const freq = bill.frequency ?? 'monthly';
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={(bill.variable ? 'flash' : cat?.icon ?? 'receipt') as any}
          size={16}
          color={bill.active ? Corpus.textMuted : Corpus.textFaint}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !bill.active && { color: Corpus.textFaint }]}>{bill.name}</Text>
          {freq !== 'monthly' && <Text style={styles.tag}>{freq === 'yearly' ? 'YEARLY' : 'QUARTERLY'}</Text>}
          {bill.variable && <Text style={styles.tag}>VARIES</Text>}
        </View>
        <Text style={[styles.meta, { color: status.color }]}>{status.text}</Text>
        {(() => {
          const left = remainingPayments(bill);
          if (left === null || left === 0) return null;
          const owed = bill.loan ? loanStatus(bill.loan, isPaidThisMonth(bill)).outstanding : null;
          return (
            <Text style={styles.loan}>
              {owed !== null ? `${formatINR(Math.round(owed))} owed · ` : ''}
              {left} payment{left === 1 ? '' : 's'} left · ends {endLabel(bill)}
            </Text>
          );
        })()}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, !bill.active && { color: Corpus.textFaint }]}>
          {bill.variable ? '~' : ''}
          {formatINR(bill.amount)}
        </Text>
        {action && (
          <Pressable
            onPress={action.onPress}
            hitSlop={6}
            style={[
              styles.action,
              action.filled ? { backgroundColor: Corpus.gold } : { borderWidth: 0.5, borderColor: Corpus.gold },
            ]}
          >
            <Text style={[styles.actionText, { color: action.filled ? Corpus.onGold : Corpus.gold }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

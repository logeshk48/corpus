import { Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { billsNeedingAttention, endLabel, needsAmount, ordinal, remainingPayments } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './BillAlerts.styles';

type Props = {
  bills: Bill[];
  onPay: (bill: Bill) => void;
  onOpen: (bill: Bill) => void;
};

// Shown at the very top of Home when a bill needs you: due within 3 days, today, overdue, or needs an amount
export default function BillAlerts({ bills, onPay, onOpen }: Props) {
  const alerts = billsNeedingAttention(bills, 3).slice(0, 3);
  if (alerts.length === 0) return null;

  return (
    <View style={styles.list}>
      {alerts.map(({ bill, daysAway }) => {
        const variable = needsAmount(bill);
        const overdue = daysAway < 0;
        const tone = overdue
          ? { color: Corpus.danger, bg: Corpus.dangerTint, border: Corpus.dangerLine }
          : daysAway === 0 || variable
          ? { color: Corpus.warning, bg: Corpus.warningTint, border: Corpus.warningLine }
          : { color: Corpus.gold, bg: Corpus.goldTint, border: Corpus.goldLine };
        const when = variable
          ? "Due — enter this month's amount"
          : overdue
          ? `${-daysAway} day${daysAway === -1 ? '' : 's'} overdue · was due ${ordinal(bill.dayOfMonth)}`
          : daysAway === 0
          ? 'Due today'
          : daysAway === 1
          ? `Due tomorrow · ${ordinal(bill.dayOfMonth)}`
          : `Due in ${daysAway} days · ${ordinal(bill.dayOfMonth)}`;
        const left = remainingPayments(bill);

        return (
          <Pressable
            key={bill.id}
            onPress={() => onOpen(bill)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: tone.bg, borderColor: tone.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.icon, { backgroundColor: `${tone.color}22` }]}>
              <Ionicons name={overdue ? 'alert-circle' : variable ? 'flash' : 'notifications'} size={18} color={tone.color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>
                {bill.name} · {variable ? '~' : ''}
                {formatINR(bill.amount)}
              </Text>
              <Text style={[styles.sub, { color: tone.color }]}>{when}</Text>
              {left !== null && left > 0 && (
                <Text style={styles.loan}>
                  {left} payment{left === 1 ? '' : 's'} left · ends {endLabel(bill)}
                </Text>
              )}
            </View>
            <Pressable onPress={() => onPay(bill)} style={[styles.button, { backgroundColor: tone.color }]} hitSlop={6}>
              <Text style={styles.buttonText}>{variable ? 'Enter amount' : 'Pay now'}</Text>
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

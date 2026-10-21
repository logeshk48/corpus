import { Corpus } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { monthlyBillsTotal, upcomingBills } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './UpcomingBills.styles';

function whenLabel(daysAway: number) {
  if (daysAway < 0) return { text: 'Overdue', color: Corpus.danger };
  if (daysAway === 0) return { text: 'Today', color: Corpus.warning };
  if (daysAway === 1) return { text: 'Tomorrow', color: Corpus.warning };
  return { text: `In ${daysAway} days`, color: Corpus.textMuted };
}

export default function UpcomingBills({ bills, onPress }: { bills: Bill[]; onPress: () => void }) {
  const active = bills.filter((b) => b.active);
  const upcoming = upcomingBills(bills, 7).slice(0, 3);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name="repeat" size={16} color="#C88BDB" />
        </View>
        <Text style={styles.title}>Recurring bills</Text>
        <Text style={styles.value}>
          {active.length > 0 ? `${formatINR(monthlyBillsTotal(bills))}/month` : 'Set up'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textMuted} />
      </View>

      {active.length > 0 && (
        <View style={styles.list}>
          {upcoming.length === 0 ? (
            <Text style={styles.none}>Nothing due in the next 7 days 🎉</Text>
          ) : (
            upcoming.map(({ bill, daysAway }) => {
              const w = whenLabel(daysAway);
              return (
                <View key={bill.id} style={styles.row}>
                  <Text style={[styles.when, { color: w.color }]}>{w.text}</Text>
                  <Text style={styles.name} numberOfLines={1}>{bill.name}</Text>
                  <Text style={styles.amount}>{formatINR(bill.amount)}</Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </Pressable>
  );
}

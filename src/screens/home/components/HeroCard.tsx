import { Corpus } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './HeroCard.styles';

const STATUS_COLOR = {
  ok: Corpus.gold,
  tight: Corpus.warning,
  over: Corpus.danger,
};

type HeroCardProps = {
  result: SafeToSpendResult;
  loading?: boolean;
  onPress: () => void;
};

export default function HeroCard({ result, loading, onPress }: HeroCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Safe to spend today</Text>
        <Text style={[styles.amount, { color: Corpus.textFaint }]}>···</Text>
      </View>
    );
  }

  if (result.status === 'noData') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <Text style={styles.label}>Safe to spend today</Text>
        <Text style={[styles.amount, { color: Corpus.textFaint }]}>₹ —</Text>
        <Text style={styles.emptyText}>
          Add this month's income (or set a monthly budget in Settings) and Corpus will tell you
          exactly how much you can spend each day.
        </Text>
        <View style={styles.how}>
          <Text style={styles.howText}>How does it work?</Text>
          <Ionicons name="chevron-forward" size={13} color={Corpus.gold} />
        </View>
      </Pressable>
    );
  }

  const color = STATUS_COLOR[result.status];
  const over = result.safeToday < 0;
  const label = over ? "Over today's limit by" : 'Safe to spend today';
  const amount = formatINR(Math.abs(result.safeToday));

  let context = `${formatINR(result.dailyAllowance)}/day for the next ${result.daysLeft} day${result.daysLeft === 1 ? '' : 's'}`;
  if (result.available < 0) context = `You've used ${formatINR(-result.available)} more than this month allows`;
  else if (result.status === 'tight') context = `Most of today's ${formatINR(result.dailyAllowance)} is used — go easy`;
  else if (over) context = `Tomorrow's allowance adjusts to ${formatINR(result.tomorrowAllowance)}/day`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
      <Text style={styles.context}>{context}</Text>

      <View style={styles.chips}>
        {result.spentToday > 0 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Spent today {formatINR(result.spentToday)}</Text>
          </View>
        )}
        {result.limitedByBudget && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>Capped by your monthly budget</Text>
          </View>
        )}
        {result.plansDue > 0 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{formatINR(result.plansDue)} kept for jar goals</Text>
          </View>
        )}
      </View>

      <View style={styles.how}>
        <Text style={styles.howText}>How is this calculated?</Text>
        <Ionicons name="chevron-forward" size={13} color={Corpus.gold} />
      </View>
    </Pressable>
  );
}

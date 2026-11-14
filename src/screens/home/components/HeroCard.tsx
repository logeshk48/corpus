import { ActivityRing } from '@/components/ui';
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

// Two rings, Apple Activity style: outer = this month's money used, inner = how far through the month you are
function Rings({ used, through }: { used: number; through: number }) {
  return (
    <View style={styles.rings} accessibilityLabel={`${Math.round(used * 100)}% of this month's money used, ${Math.round(through * 100)}% of the month gone`}>
      <ActivityRing size={92} thickness={12} progress={used} color={Corpus.gold} track={Corpus.goldTint} />
      <View style={styles.inner}>
        <ActivityRing size={58} thickness={12} progress={through} color={Corpus.warning} track={Corpus.warningTint} />
      </View>
    </View>
  );
}

type HeroCardProps = {
  result: SafeToSpendResult;
  loading?: boolean;
  onPress: () => void;
};

export default function HeroCard({ result, loading, onPress }: HeroCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.left}>
          <Text style={styles.label}>Safe to spend today</Text>
          <Text style={[styles.amount, { color: Corpus.textFaint }]}>···</Text>
        </View>
      </View>
    );
  }

  if (result.status === 'noData') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, styles.cardCol, pressed && styles.pressed]}>
        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.label}>Safe to spend today</Text>
            <Text style={[styles.amount, { color: Corpus.textFaint }]}>₹ —</Text>
          </View>
          <Rings used={0} through={new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} />
        </View>
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
  // A single precise figure reads as a spending target, so show a comfortable range
  const low = Math.max(0, Math.floor((result.safeToday * 0.9) / 10) * 10);
  const high = Math.ceil((result.safeToday * 1.1) / 10) * 10;
  const asRange = !over && result.safeToday >= 50;
  const label = over ? "Over today's limit by" : asRange ? 'Today you can spend about' : 'Safe to spend today';
  const amount = asRange ? `${formatINR(low)}–${formatINR(high).replace('₹', '')}` : formatINR(Math.abs(result.safeToday));

  let context = `${formatINR(result.dailyAllowance)}/day for the next ${result.daysLeft} day${result.daysLeft === 1 ? '' : 's'}`;
  if (result.available < 0) context = `You've used ${formatINR(-result.available)} more than this month allows`;
  else if (result.status === 'tight') context = `Most of today's ${formatINR(result.dailyAllowance)} is used — go easy`;
  else if (over) context = `Tomorrow's allowance adjusts to ${formatINR(result.tomorrowAllowance)}/day`;

  const used = result.income + (result.monthlyBudget ?? 0) > 0 ? Math.min(1, Math.max(0, 1 - Math.max(result.available, 0) / Math.max(1, result.available + result.spent))) : 0;
  const through = Math.min(1, Math.max(0, (result.cycleDays - result.daysLeft + 1) / Math.max(1, result.cycleDays)));

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, styles.cardCol, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.amount, { color: over ? Corpus.danger : Corpus.text }]} numberOfLines={1} adjustsFontSizeToFit>{amount}</Text>
          <Text style={[styles.context, { color: result.status === 'ok' ? Corpus.textMuted : color }]}>{context}</Text>
        </View>
        <Rings used={used} through={through} />
      </View>

      {(result.spentToday > 0 || result.limitedByBudget || result.billsDue > 0 || result.plansDue > 0) && (
        <View style={styles.chips}>
          {result.spentToday > 0 && <View style={styles.chip}><Text style={styles.chipText}>Spent today {formatINR(result.spentToday)}</Text></View>}
          {result.limitedByBudget && <View style={styles.chip}><Text style={styles.chipText}>Capped by your monthly budget</Text></View>}
          {result.billsDue > 0 && <View style={styles.chip}><Text style={styles.chipText}>{formatINR(result.billsDue)} kept for bills</Text></View>}
          {result.plansDue > 0 && <View style={styles.chip}><Text style={styles.chipText}>{formatINR(result.plansDue)} kept for jar goals</Text></View>}
        </View>
      )}

      <View style={styles.legend}>
        <View style={[styles.key, { backgroundColor: Corpus.gold }]} /><Text style={styles.legendText}>Money used {Math.round(used * 100)}%</Text>
        <View style={[styles.key, { backgroundColor: Corpus.warning }]} /><Text style={styles.legendText}>Day {result.cycleDays - result.daysLeft + 1} of {result.cycleDays}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.howText}>How it works</Text>
        <Ionicons name="chevron-forward" size={13} color={Corpus.gold} />
      </View>
    </Pressable>
  );
}

import { ActivityRing } from '@/components/ui';
import { useEntrance } from '@/hooks/useEntrance';
import { Corpus, Type } from '@/constants/theme';
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

// The amount sits beside the rings, so a long range ("₹1,230–1,510") gets a smaller size instead of being cut off
const amountSize = (a: string) => (a.length <= 7 ? Type.entry : a.length <= 9 ? Type.amount : Type.h1);

const PILL = {
  ok: { text: 'On track', bg: Corpus.goldTint, fg: Corpus.gold },
  tight: { text: 'Go easy', bg: Corpus.warningTint, fg: Corpus.warning },
  over: { text: 'Over today', bg: Corpus.dangerTint, fg: Corpus.danger },
};

type HeroCardProps = {
  result: SafeToSpendResult;
  loading?: boolean;
  onPress: () => void;
};

export default function HeroCard({ result, loading, onPress }: HeroCardProps) {
  const t = useEntrance(900, loading ? 0 : 1);
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
          <Rings used={0} through={(t * new Date().getDate()) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} />
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
  const low = Math.max(0, Math.floor((result.safeToday * 0.9 * t) / 10) * 10);
  const high = Math.ceil((result.safeToday * 1.1 * t) / 10) * 10;
  const asRange = !over && result.safeToday >= 50;
  const label = over ? "Over today's limit by" : asRange ? 'Today you can spend about' : 'Safe to spend today';
  const amount = asRange ? `${formatINR(low)}–${formatINR(high).replace('₹', '')}` : formatINR(Math.round(Math.abs(result.safeToday) * t));

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
          <View style={styles.labelRow}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.pill, { backgroundColor: PILL[result.status].bg }]}>
              <Text style={[styles.pillText, { color: PILL[result.status].fg }]}>{PILL[result.status].text}</Text>
            </View>
          </View>
          <Text style={[styles.amount, { color: over ? Corpus.danger : Corpus.text, fontSize: amountSize(amount) }]} numberOfLines={1} adjustsFontSizeToFit>{amount}</Text>
          <Text style={[styles.context, { color: result.status === 'ok' ? Corpus.textMuted : color }]}>{context}</Text>
        </View>
        <Rings used={used * t} through={through * t} />
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

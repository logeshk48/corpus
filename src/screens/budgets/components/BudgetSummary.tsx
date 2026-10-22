import { Corpus } from '@/constants/theme';
import { monthProgress, perDayLeft, spendingPace } from '@/utils/budgets';
import { daysLeftInMonth } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './BudgetSummary.styles';

type BudgetSummaryProps = {
  title: string; // "This month" or "Budgeted categories"
  spent: number;
  limit: number;
};

const PACE_UI = {
  onTrack: { label: 'On track', icon: 'checkmark-circle', color: Corpus.income, bg: Corpus.incomeTint },
  fast: { label: 'Spending fast', icon: 'speedometer', color: Corpus.warning, bg: Corpus.warningTint },
  over: { label: 'Over budget', icon: 'alert-circle', color: Corpus.danger, bg: Corpus.dangerTint },
} as const;

export default function BudgetSummary({ title, spent, limit }: BudgetSummaryProps) {
  const remaining = limit - spent;
  const pace = spendingPace(spent, limit);
  const ui = PACE_UI[pace];
  const fillPercent = Math.min((spent / limit) * 100, 100);
  const markerPercent = Math.min(monthProgress() * 100, 100);
  const daysLeft = daysLeftInMonth();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>{title.toUpperCase()}</Text>
          <Text style={styles.bigNumber}>{formatINR(spent)}</Text>
          <Text style={styles.ofLimit}>of {formatINR(limit)} budget</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: ui.bg }]}>
          <Ionicons name={ui.icon} size={13} color={ui.color} />
          <Text style={[styles.badgeText, { color: ui.color }]}>{ui.label}</Text>
        </View>
      </View>

      <View style={styles.barWrap}>
        <View style={styles.markerRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${fillPercent}%`, backgroundColor: ui.color }]} />
          </View>
          {/* where your spending "should" be today */}
          <View style={[styles.marker, { left: `${markerPercent}%` }]} />
        </View>
        <Text style={styles.markerHint}>Gold line = where you'd be if spending evenly through the month</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{remaining >= 0 ? 'Left' : 'Over by'}</Text>
          <Text style={[styles.statValue, remaining < 0 && { color: Corpus.danger }]}>
            {formatINR(Math.abs(remaining))}
          </Text>
        </View>
        <View style={[styles.stat, styles.statDivider]}>
          <Text style={styles.statLabel}>Per day</Text>
          <Text style={[styles.statValue, styles.statGold]}>
            {formatINR(Math.floor(perDayLeft(remaining)))}
          </Text>
        </View>
        <View style={[styles.stat, styles.statDivider]}>
          <Text style={styles.statLabel}>Days left</Text>
          <Text style={styles.statValue}>{daysLeft}</Text>
        </View>
      </View>
    </View>
  );
}

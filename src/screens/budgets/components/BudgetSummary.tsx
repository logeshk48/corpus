import Bullet from '@/components/charts/Bullet';
import { Tap } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useEntrance } from '@/hooks/useEntrance';
import { useTween } from '@/hooks/useTween';
import { monthProgress, perDayLeft, spendingPace } from '@/utils/budgets';
import { daysLeftInMonth } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './BudgetSummary.styles';

const PACE = {
  onTrack: { label: 'On track', icon: 'checkmark-circle', color: Corpus.income, bg: Corpus.incomeTint },
  fast: { label: 'Spending fast', icon: 'speedometer', color: Corpus.warning, bg: Corpus.warningTint },
  over: { label: 'Over budget', icon: 'alert-circle', color: Corpus.danger, bg: Corpus.dangerTint },
} as const;

const month = () => new Date().toLocaleDateString('en-IN', { month: 'long' });

// The month at a glance: what you spent against your budget, the even-pace tick, and what's left per day.
export default function BudgetSummary({ spent, limit, monthly, onEditMonthly }: {
  spent: number; limit: number | null; monthly?: number; onEditMonthly: () => void;
}) {
  const t = useEntrance(800);
  const spentV = useTween(spent);
  const pace = limit ? spendingPace(spent, limit) : null;
  const ui = pace ? PACE[pace] : null;
  const remaining = limit ? limit - spent : 0;
  const evenNow = limit ? Math.round(limit * monthProgress()) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Spent in {month()}</Text>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(spentV))}</Text>
          {limit ? <Text style={styles.of}>of {formatINR(limit)} {monthly ? 'monthly budget' : 'across your limits'}</Text> : null}
        </View>
        {ui && (
          <View style={[styles.pill, { backgroundColor: ui.bg }]}>
            <Ionicons name={ui.icon} size={14} color={ui.color} />
            <Text style={[styles.pillText, { color: ui.color }]}>{ui.label}</Text>
          </View>
        )}
      </View>

      {limit ? (
        <>
          <View style={{ marginTop: 14 }} accessible accessibilityLabel={`${Math.round((spent / limit) * 100)} percent of your budget used. Even spending would be ${formatINR(evenNow)} by today.`}>
            <Bullet value={spent} limit={limit} pace={monthProgress()} color={ui!.color} height={12} appear={t} />
            <View style={styles.paceRow}>
              <View style={styles.tick} />
              <Text style={styles.paceText}>Even pace by today: {formatINR(evenNow)}</Text>
            </View>
          </View>
          <View style={styles.strip}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{remaining >= 0 ? 'Left' : 'Over by'}</Text>
              <Text style={[styles.statValue, remaining < 0 && { color: Corpus.danger }]} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.abs(remaining))}</Text>
            </View>
            <View style={styles.rule} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>A day</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.floor(perDayLeft(remaining)))}</Text>
            </View>
            <View style={styles.rule} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Days left</Text>
              <Text style={styles.statValue}>{daysLeftInMonth()}</Text>
            </View>
          </View>
        </>
      ) : null}

      <Tap onPress={onEditMonthly} style={styles.monthly} accessibilityRole="button" scaleTo={0.98}>
        <Text style={styles.monthlyLabel}>Monthly budget</Text>
        <Text style={styles.monthlyValue}>{monthly ? formatINR(monthly) : 'Not set'}</Text>
        <Text style={styles.monthlyAction}>{monthly ? 'Change' : 'Set'}</Text>
      </Tap>
    </View>
  );
}

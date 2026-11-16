import Bullet from '@/components/charts/Bullet';
import { IconChip } from '@/components/ui';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import { monthProgress, perDayLeft, type BudgetStatus } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './BudgetCard.styles';

const STATE = {
  ok: { color: Corpus.income, icon: null },
  warning: { color: Corpus.warning, icon: 'alert-circle' },
  over: { color: Corpus.danger, icon: 'alert-circle' },
} as const;

// One category limit as a row: what's left on the right, a bullet bar underneath with today's even-pace tick.
export default function BudgetCard({ budget, onPress, appear = 1 }: { budget: BudgetStatus; onPress: () => void; appear?: number }) {
  const ui = STATE[budget.state];
  const over = budget.state === 'over';
  const day = Math.floor(perDayLeft(budget.remaining));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]}
      accessibilityRole="button"
      accessibilityLabel={`${budget.label}: ${formatINR(budget.spent)} of ${formatINR(budget.limit)}. ${over ? `Over by ${formatINR(-budget.remaining)}` : `${formatINR(budget.remaining)} left`}`}
      accessibilityHint="Edit this limit"
    >
      <View style={styles.top}>
        <IconChip icon={budget.icon} color={CategoryChip[budget.categoryId] ?? Chip.gray} />
        <View style={styles.middle}>
          <Text style={styles.name} numberOfLines={1}>{budget.label}</Text>
          <Text style={styles.meta}>{formatINR(budget.spent)} of {formatINR(budget.limit)}</Text>
        </View>
        <View style={styles.right}>
          <View style={styles.leftLine}>
            {ui.icon && <Ionicons name={ui.icon} size={14} color={ui.color} />}
            <Text style={[styles.left, budget.state !== 'ok' && { color: ui.color }]}>
              {over ? `${formatINR(-budget.remaining)} over` : `${formatINR(budget.remaining)} left`}
            </Text>
          </View>
          <Text style={styles.meta}>{over ? 'past the limit' : budget.state === 'warning' ? 'nearly used' : `${formatINR(day)} a day`}</Text>
        </View>
      </View>
      <View style={styles.bar}>
        <Bullet value={budget.spent} limit={budget.limit} pace={monthProgress()} color={ui.color} height={8} appear={appear} />
      </View>
    </Pressable>
  );
}

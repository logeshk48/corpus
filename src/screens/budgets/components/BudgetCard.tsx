import { Corpus } from '@/constants/theme';
import { perDayLeft, type BudgetStatus } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './BudgetCard.styles';

const STATE_UI = {
  ok: { color: Corpus.income, bg: Corpus.incomeTint },
  warning: { color: Corpus.warning, bg: Corpus.warningTint },
  over: { color: Corpus.danger, bg: Corpus.dangerTint },
} as const;

type BudgetCardProps = {
  budget: BudgetStatus;
  onPress: () => void;
};

export default function BudgetCard({ budget, onPress }: BudgetCardProps) {
  const ui = STATE_UI[budget.state];
  const width = Math.min(budget.percent, 100);

  const status =
    budget.state === 'over'
      ? `Over by ${formatINR(-budget.remaining)}`
      : `${formatINR(budget.remaining)} left · ${formatINR(Math.floor(perDayLeft(budget.remaining)))}/day`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: ui.bg }]}>
          <Ionicons name={budget.icon as any} size={17} color={ui.color} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.name}>{budget.label}</Text>
          <Text style={styles.amounts}>
            {formatINR(budget.spent)} of {formatINR(budget.limit)}
          </Text>
        </View>
        <Text style={[styles.percent, { color: ui.color }]}>{Math.round(budget.percent)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: ui.color }]} />
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.status, { color: ui.color }]}>{status}</Text>
        <View style={styles.editHint}>
          <Ionicons name="create-outline" size={12} color={Corpus.textFaint} />
          <Text style={styles.editText}>Edit</Text>
        </View>
      </View>
    </Pressable>
  );
}

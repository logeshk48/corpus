import { Corpus } from '@/constants/theme';
import { Text, View } from 'react-native';
import { styles } from './BudgetBar.styles';

type BudgetBarProps = {
  label: string;
  spent: number;
  total: number;
};

export default function BudgetBar({ label, spent, total }: BudgetBarProps) {
  const percent = Math.min((spent / total) * 100, 100);
  const isOver = spent > total;
  const isWarning = !isOver && percent >= 80;

  const fillColor = isOver
    ? Corpus.danger
    : isWarning
    ? Corpus.warning
    : Corpus.income;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={isOver ? styles.amountsOver : styles.amounts}>
          ₹{spent.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}
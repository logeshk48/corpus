import { findCategory } from '@/constants/categories';
import type { Settings } from '@/types/settings';
import type { Transaction } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { splitIncome } from '@/utils/vaults';
import { Text, View } from 'react-native';
import { VAULT_COLORS } from './IncomeSplitCard';
import { styles } from './IncomeSplitList.styles';

type IncomeSplitListProps = {
  incomes: Transaction[];
  settings: Settings;
};

const MAX_ROWS = 8;

export default function IncomeSplitList({ incomes, settings }: IncomeSplitListProps) {
  const shown = incomes.slice(0, MAX_ROWS);

  return (
    <View style={styles.group}>
      {shown.map((tx, i) => {
        const split = splitIncome(tx, settings);
        const name = tx.note ?? findCategory(tx.type, tx.category)?.label ?? 'Income';
        const day = new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return (
          <View key={tx.id} style={[styles.row, i > 0 && styles.divider]}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {name} · {day}
              </Text>
              <Text style={styles.amount}>+{formatINR(tx.amount)}</Text>
            </View>
            <View style={styles.parts}>
              {split.tax > 0 && (
                <View style={styles.part}>
                  <View style={[styles.dot, { backgroundColor: VAULT_COLORS.tax }]} />
                  <Text style={styles.partText}>Tax {formatINR(split.tax)}</Text>
                </View>
              )}
              {split.savings > 0 && (
                <View style={styles.part}>
                  <View style={[styles.dot, { backgroundColor: VAULT_COLORS.savings }]} />
                  <Text style={styles.partText}>Savings {formatINR(split.savings)}</Text>
                </View>
              )}
              <View style={styles.part}>
                <View style={[styles.dot, { backgroundColor: VAULT_COLORS.yours }]} />
                <Text style={styles.partText}>Yours {formatINR(split.yours)}</Text>
              </View>
            </View>
          </View>
        );
      })}
      {incomes.length > MAX_ROWS && (
        <Text style={styles.more}>+ {incomes.length - MAX_ROWS} more this month</Text>
      )}
    </View>
  );
}

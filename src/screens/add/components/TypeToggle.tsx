import type { TxType } from '@/types/transaction';
import { Pressable, Text, View } from 'react-native';
import { styles } from './TypeToggle.styles';

export type { TxType } from '@/types/transaction';

type TypeToggleProps = {
  value: TxType;
  onChange: (type: TxType) => void;
};

export default function TypeToggle({ value, onChange }: TypeToggleProps) {
  return (
    <View style={styles.track}>
      <Pressable
        style={[styles.option, value === 'expense' && styles.optionActiveExpense]}
        onPress={() => onChange('expense')}
      >
        <Text style={[styles.label, value === 'expense' && styles.labelActiveExpense]}>
          Expense
        </Text>
      </Pressable>
      <Pressable
        style={[styles.option, value === 'income' && styles.optionActiveIncome]}
        onPress={() => onChange('income')}
      >
        <Text style={[styles.label, value === 'income' && styles.labelActiveIncome]}>
          Income
        </Text>
      </Pressable>
    </View>
  );
}
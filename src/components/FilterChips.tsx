import { Pressable, Text, View } from 'react-native';
import { styles } from './FilterChips.styles';

export type ChipOption<T extends string> = {
  id: T;
  label: string;
};

type FilterChipsProps<T extends string> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Reusable pill selector — works with any set of string ids
export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: FilterChipsProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.id)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

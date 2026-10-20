import { Corpus } from '@/constants/theme';
import type { Category } from '@/constants/categories';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './UnbudgetedRow.styles';

type UnbudgetedRowProps = {
  category: Category;
  spent: number;
  first: boolean;
  onPress: () => void;
};

export default function UnbudgetedRow({ category, spent, first, onPress }: UnbudgetedRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={category.icon as any} size={15} color={Corpus.textMuted} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.name}>{category.label}</Text>
        <Text style={styles.spent}>
          {spent > 0 ? `${formatINR(spent)} spent this month` : 'Nothing spent this month'}
        </Text>
      </View>
      <View style={styles.setButton}>
        <Ionicons name="add" size={12} color={Corpus.gold} />
        <Text style={styles.setText}>Set limit</Text>
      </View>
    </Pressable>
  );
}

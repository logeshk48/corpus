import { IconChip } from '@/components/ui';
import type { Category } from '@/constants/categories';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { Pressable, Text, View } from 'react-native';
import { styles } from './UnbudgetedRow.styles';

// A category without a limit: what you've spent, and a quiet "Set limit" on the right
export default function UnbudgetedRow({ category, spent, onPress }: { category: Category; spent: number; first?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button" accessibilityLabel={`Set a limit for ${category.label}`}>
      <IconChip icon={category.icon} color={CategoryChip[category.id] ?? Chip.gray} />
      <View style={styles.middle}>
        <Text style={styles.name}>{category.label}</Text>
        <Text style={styles.spent}>{spent > 0 ? `${formatINR(spent)} this month` : 'Nothing yet'}</Text>
      </View>
      <View style={styles.set}>
        <Text style={styles.setText}>Set limit</Text>
      </View>
    </Pressable>
  );
}

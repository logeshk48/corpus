import { IconChip } from '@/components/ui';
import { Category } from '@/constants/categories';
import { CategoryChip, Chip } from '@/constants/theme';
import { Pressable, Text, View } from 'react-native';
import { styles } from './CategoryGrid.styles';

type CategoryGridProps = { categories: Category[]; selected: string | null; onSelect: (id: string) => void };

// Coloured icon squares, 4 per row; the chosen one gets a ring in its own colour
export default function CategoryGrid({ categories, selected, onSelect }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const on = cat.id === selected;
        const color = CategoryChip[cat.id] ?? Chip.gray;
        return (
          <Pressable key={cat.id} style={styles.item} onPress={() => onSelect(cat.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={cat.label}>
            <View style={[styles.ring, on && { borderColor: color }]}>
              <IconChip icon={cat.icon} color={color} size={48} />
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>{cat.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { Category } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './CategoryGrid.styles';

type CategoryGridProps = {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
};

export default function CategoryGrid({ categories, selected, onSelect }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const isSelected = cat.id === selected;
        return (
          <Pressable
            key={cat.id}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(cat.id)}
          >
            <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
              <Ionicons
                name={cat.icon as any}
                size={20}
                color={isSelected ? Corpus.gold : Corpus.textMuted}
              />
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
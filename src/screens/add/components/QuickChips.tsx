import { findCategory } from '@/constants/categories';
import { IconChip } from '@/components/ui';
import { CategoryChip, Chip as Palette } from '@/constants/theme';
import type { TxType } from '@/types/transaction';
import { formatINR } from '@/utils/format';
import { Pressable, ScrollView, Text } from 'react-native';
import { styles } from './QuickChips.styles';

export type Chip = { note: string; category: string; amount?: number };

type Props = { items: Chip[]; type: TxType; onPick: (c: Chip) => void };

// Horizontal row of one-tap fills: "☕ Chai ₹20"
export default function QuickChips({ items, type, onPick }: Props) {
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {items.map((c) => {
        const cat = findCategory(type, c.category);
        return (
          <Pressable key={`${c.note}|${c.category}|${c.amount}`} style={styles.chip} onPress={() => onPick(c)}>
            <IconChip icon={cat?.icon ?? 'ellipsis-horizontal'} color={CategoryChip[c.category] ?? Palette.gray} size={28} />
            <Text style={styles.text}>{c.note || cat?.label || c.category}</Text>
            {c.amount ? <Text style={styles.amount}>{formatINR(c.amount)}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

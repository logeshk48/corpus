import { findCategory } from '@/constants/categories';
import { IconChip } from '@/components/ui';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import type { QuickPick } from '@/utils/quickAdd';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from './QuickAdd.styles';

type Props = { picks: QuickPick[]; onLog: (p: QuickPick) => Promise<void>; onMore: () => void };

// One tap = logged. The slowest part of any tracker is getting to the form,
// so the things you log again and again live right on Home.
export default function QuickAdd({ picks, onLog, onMore }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  if (picks.length === 0) return null;

  const tap = async (p: QuickPick) => {
    const key = `${p.note}|${p.amount}`;
    if (busy) return;
    setBusy(key);
    try {
      await onLog(p);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.headText} accessibilityRole="header">Your usuals</Text>
        <Pressable onPress={onMore} hitSlop={8}>
          <Text style={styles.more}>Something else</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {picks.map((p) => {
          const key = `${p.note}|${p.amount}`;
          const cat = findCategory('expense', p.category);
          return (
            <Pressable key={key} style={({ pressed }) => [styles.chip, busy === key && styles.chipBusy, pressed && { transform: [{ scale: 0.96 }] }]} onPress={() => tap(p)} disabled={!!busy} accessibilityLabel={`Log ${p.note || cat?.label} ${formatINR(p.amount)}`}>
              {busy === key ? (
                <ActivityIndicator size="small" color={Corpus.gold} />
              ) : (
                <IconChip icon={cat?.icon ?? 'ellipsis-horizontal'} color={CategoryChip[p.category] ?? Chip.gray} size={26} />
              )}
              <Text style={styles.name}>{p.note || cat?.label || p.category}</Text>
              <Text style={styles.amount}>{formatINR(p.amount)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

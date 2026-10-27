import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
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
        <Ionicons name="flash" size={13} color={Corpus.gold} />
        <Text style={styles.headText}>ONE TAP TO LOG</Text>
        <Pressable onPress={onMore} hitSlop={8}>
          <Text style={styles.more}>Something else</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {picks.map((p) => {
          const key = `${p.note}|${p.amount}`;
          const cat = findCategory('expense', p.category);
          return (
            <Pressable key={key} style={[styles.chip, busy === key && styles.chipBusy]} onPress={() => tap(p)} disabled={!!busy}>
              {busy === key ? (
                <ActivityIndicator size="small" color={Corpus.gold} />
              ) : (
                <Ionicons name={(cat?.icon ?? 'ellipsis-horizontal') as keyof typeof Ionicons.glyphMap} size={15} color={Corpus.textMuted} />
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

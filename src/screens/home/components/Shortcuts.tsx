import { Corpus, Radius, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type Shortcut = {
  key: string;
  label: string;
  icon: string;
  value: string;        // short status: "₹5.2K", "Update", "All square"
  tone?: 'normal' | 'warn' | 'danger' | 'good';
  onPress: () => void;
};

const TONE = { normal: Corpus.textMuted, warn: Corpus.warning, danger: Corpus.danger, good: Corpus.income };

// Everything that isn't today's job, in one compact grid instead of a long list
export default function Shortcuts({ items }: { items: Shortcut[] }) {
  return (
    <View style={styles.grid}>
      {items.map((s, i) => (
        <Pressable
          key={s.key}
          style={({ pressed }) => [styles.tile, i % 3 !== 2 && styles.tileRight, i < items.length - 3 && styles.tileBottom, pressed && { backgroundColor: Corpus.cardAlt }]}
          onPress={s.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${s.label}, ${s.value}`}
        >
          <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
          <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
          <Text style={[styles.value, { color: TONE[s.tone ?? 'normal'] }]} numberOfLines={1}>{s.value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // One panel split by hairlines — the shortcuts are a menu, not six separate things
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  tile: { width: '33.333%', minHeight: 84, padding: 12, gap: 4 },
  tileRight: { borderRightWidth: 0.5, borderRightColor: Corpus.border },
  tileBottom: { borderBottomWidth: 0.5, borderBottomColor: Corpus.border },
  label: { fontSize: Type.body, fontWeight: '600', color: Corpus.text, marginTop: 4 },
  value: { fontSize: Type.small },
});

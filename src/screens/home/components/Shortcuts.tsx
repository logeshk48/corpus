import { Corpus, Radius, Space, Type } from '@/constants/theme';
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
      {items.map((s) => (
        <Pressable
          key={s.key}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 84,
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: 12,
    gap: 4,
  },
  label: { fontSize: Type.body, fontWeight: '600', color: Corpus.text, marginTop: 4 },
  value: { fontSize: Type.small },
});

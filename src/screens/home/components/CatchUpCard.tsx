import { IconChip } from '@/components/ui';
import { Chip, Corpus, Font, Space, Type } from '@/constants/theme';
import type { CatchUp } from '@/utils/catchUp';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Missing a few days is the #1 reason people quit trackers: they feel behind and
// delete the app. No guilt, no streak — just an easy way back in.
export default function CatchUpCard({ data, onPress }: { data: CatchUp; onPress: () => void }) {
  const since = data.lastLogged
    ? data.missedDays <= 6
      ? data.lastLogged.toLocaleDateString('en-IN', { weekday: 'long' })
      : data.lastLogged.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button">
      <View style={styles.row}>
        <IconChip icon="time" color={Chip.orange} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nothing logged since {since}</Text>
          <Text style={styles.text}>
            Add what you remember. A rough amount beats a gap.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Corpus.textFaint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md - 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  text: { fontSize: Type.body, color: Corpus.textMuted, marginTop: 2, lineHeight: 18 },
});

import { IconChip } from '@/components/ui';
import { Font, Pastel, Space, Type } from '@/constants/theme';
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
        <IconChip icon="time" color={P.icon} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nothing logged since {since}</Text>
          <Text style={styles.text}>
            Takes a minute to fill in. Add what you remember — a rough amount is better than nothing.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={P.fg} />
      </View>
    </Pressable>
  );
}

const P = Pastel.butter;
const styles = StyleSheet.create({
  card: { backgroundColor: P.bg, borderRadius: 24, padding: Space.md - 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: Type.label, fontFamily: Font.display, color: P.fg },
  text: { fontSize: Type.small, color: P.fg, marginTop: 2, lineHeight: 17 },
});

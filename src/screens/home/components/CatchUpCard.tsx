import { Corpus, Radius, Space, Type } from '@/constants/theme';
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
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} onPress={onPress}>
      <View style={styles.row}>
        <Ionicons name="time-outline" size={18} color={Corpus.gold} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nothing logged since {since}</Text>
          <Text style={styles.text}>
            Takes a minute to fill in. Add what you remember — a rough amount is better than nothing.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Corpus.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.goldTint,
    borderWidth: 1,
    borderColor: Corpus.goldLine,
    borderRadius: Radius.lg,
    padding: Space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  text: { fontSize: Type.small, color: Corpus.textMuted, marginTop: 2, lineHeight: 17 },
});

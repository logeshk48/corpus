import { Tap } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export type Pulse = { key: string; icon: string; color: string; label: string; value: string; sub?: string; tone?: string; onPress: () => void };

// Three numbers to read at a glance under the daily ring: today, this week, and the next bill.
// Each is a tap into the screen with the detail.
export default function PulseStrip({ items }: { items: Pulse[] }) {
  return (
    <View style={s.row}>
      {items.map((p, i) => (
        <Animated.View key={p.key} entering={FadeInDown.delay(120 + i * 70).duration(320)} style={{ flex: 1 }}>
          <Tap onPress={p.onPress} style={s.tile} accessibilityRole="button" accessibilityLabel={`${p.label}: ${p.value}${p.sub ? `, ${p.sub}` : ''}`}>
            <View style={[s.icon, { backgroundColor: p.color }]}><Ionicons name={p.icon as keyof typeof Ionicons.glyphMap} size={14} color={Corpus.sheen} /></View>
            <Text style={s.label} numberOfLines={1}>{p.label}</Text>
            <Text style={[s.value, p.tone ? { color: p.tone } : null]} numberOfLines={1}>{p.value}</Text>
            {!!p.sub && <Text style={s.sub} numberOfLines={1}>{p.sub}</Text>}
          </Tap>
        </Animated.View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  tile: { backgroundColor: Corpus.card, borderRadius: 20, padding: 12, gap: 3, minHeight: 104, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  icon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { fontSize: Type.small, color: Corpus.textMuted },
  value: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.3, ...tabular },
  sub: { fontSize: Type.small, color: Corpus.textMuted },
});
export const PULSE_COLORS = { today: Chip.orange, week: Chip.indigo, bill: Chip.red };

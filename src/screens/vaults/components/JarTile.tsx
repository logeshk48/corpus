import LiquidJar from '@/components/charts/LiquidJar';
import { Tap } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { savedOf, type VaultWithBalance } from '@/types/vault';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// One jar in the grid: the jar itself filled to how close it is to its goal, the amount, and a + to add.
// The + sits beside the card's tap area (not inside it) so web never gets a button inside a button.
export default function JarTile({ jar, width, onOpen, onAdd }: { jar: VaultWithBalance; width: number; onOpen: () => void; onAdd: () => void }) {
  const saved = savedOf(jar);
  const pct = jar.goal ? Math.min(100, Math.round((saved / jar.goal) * 100)) : null;
  const reached = jar.goal !== undefined && saved >= jar.goal;
  const line = jar.goal
    ? reached ? 'Goal reached' : `${pct}% of ${compactINR(jar.goal)}`
    : jar.addedThisMonth > 0 ? `${compactINR(jar.addedThisMonth)} this month` : 'No goal';
  return (
    <View style={{ width }}>
      <Tap onPress={onOpen} style={s.card} accessibilityRole="button" accessibilityLabel={`${jar.name}, ${formatINR(saved)} saved. ${line}`}>
        <LiquidJar level={jar.goal ? saved / jar.goal : saved > 0 ? 0.55 : 0} color={jar.color} width={52} height={68} marks={!!jar.goal} />
        <View style={{ gap: 2 }}>
          <Text style={s.name} numberOfLines={1}>{jar.name}</Text>
          <Text style={s.amount} numberOfLines={1}>{formatINR(saved)}</Text>
          <Text style={[s.line, reached && { color: Corpus.income }]} numberOfLines={1}>{line}</Text>
        </View>
        {pct !== null && (
          <View style={s.bar}><View style={[s.fill, { width: `${pct}%`, backgroundColor: jar.color }]} /></View>
        )}
      </Tap>
      <Pressable onPress={onAdd} hitSlop={6} style={({ pressed }) => [s.add, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Add money to ${jar.name}`}>
        <Ionicons name="add" size={20} color={Corpus.onGold} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 14, gap: 12, minHeight: 190 },
  name: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  amount: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.3, ...tabular },
  line: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  bar: { height: 4, borderRadius: 2, backgroundColor: Corpus.cardAlt, overflow: 'hidden', marginTop: 'auto' },
  fill: { height: 4, borderRadius: 2 },
  add: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' },
});

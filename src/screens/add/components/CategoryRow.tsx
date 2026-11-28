import { IconChip } from '@/components/ui';
import type { Category } from '@/constants/categories';
import { Spring } from '@/constants/motion';
import { CategoryChip, Chip, Corpus, Font, Type } from '@/constants/theme';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

function CatChip({ c, on, onPress }: { c: Category; on: boolean; onPress: () => void }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => { k.value = reduce ? (on ? 1 : 0) : withSpring(on ? 1 : 0, Spring.snappy); }, [on, reduce, k]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: 1 + k.value * 0.14 }, { translateY: -k.value * 3 }] }));
  const color = CategoryChip[c.id] ?? Chip.gray;
  return (
    <Pressable onPress={onPress} style={s.chip} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c.label}>
      <View style={[s.ring, on && { borderColor: color }]}>
        <Animated.View style={icon}><IconChip icon={c.icon} color={color} size={44} /></Animated.View>
      </View>
      <Text style={[s.label, on && { color: Corpus.text, fontFamily: Font.displayBold }]} numberOfLines={1}>{c.label}</Text>
    </Pressable>
  );
}

// Categories in a grid of four, so every one is in view. The picked one lifts and gets a ring in its own colour.
// `shake` is bumped by the parent when Save is tapped before a category is picked.
export default function CategoryRow({ categories, selected, onSelect, shake }: { categories: Category[]; selected: string | null; onSelect: (id: string) => void; shake: number }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!shake || reduce) return;
    x.value = withSequence(...[-10, 8, -6, 4, 0].map((v) => withTiming(v, { duration: 55, easing: Easing.linear })));
  }, [shake, reduce, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={st}>
      <View style={s.grid} accessibilityRole="radiogroup">
        {categories.map((c) => <CatChip key={c.id} c={c} on={c.id === selected} onPress={() => onSelect(c.id)} />)}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, paddingVertical: 4 },
  chip: { width: '25%', alignItems: 'center', gap: 6 },
  ring: { padding: 3, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  label: { fontSize: Type.small, color: Corpus.textMuted },
});

import { Spring } from '@/constants/motion';
import { Corpus, Font, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';

type T = 'expense' | 'income';

// Spent / Money in. The pill slides across and turns green for money in.
export default function TypeSwitch({ value, onChange }: { value: T; onChange: (v: T) => void }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const pos = useSharedValue(value === 'income' ? 1 : 0);
  useEffect(() => { pos.value = reduce ? (value === 'income' ? 1 : 0) : withSpring(value === 'income' ? 1 : 0, Spring.snappy); }, [value, reduce, pos]);
  const half = (w - 8) / 2;
  const pill = useAnimatedStyle(() => ({
    width: half,
    transform: [{ translateX: pos.value * half }],
    backgroundColor: interpolateColor(pos.value, [0, 1], [Corpus.gold, Corpus.income]),
  }));
  const opt = (v: T, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = value === v;
    return (
      <Pressable key={v} style={s.opt} onPress={() => onChange(v)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
        <Ionicons name={icon} size={16} color={on ? Corpus.onGold : Corpus.textMuted} />
        <Text style={[s.text, { color: on ? Corpus.onGold : Corpus.textMuted }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={s.track} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w > 0 && <Animated.View style={[s.pill, pill]} />}
      {opt('expense', 'Spent', 'arrow-up')}
      {opt('income', 'Money in', 'arrow-down')}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', height: 46, borderRadius: 23, backgroundColor: Corpus.card, padding: 4 },
  pill: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 19 },
  opt: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: Type.bodyLg, fontFamily: Font.display },
});

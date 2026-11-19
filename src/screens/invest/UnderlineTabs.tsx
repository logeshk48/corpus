import { Spring } from '@/constants/motion';
import { Corpus, Font, Type } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

// Broker-style tabs: words in a row with a bar that slides under the chosen one
export default function UnderlineTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const reduce = useReducedMotion();
  const [lay, setLay] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0), w = useSharedValue(0);
  useEffect(() => {
    const l = lay[value];
    if (!l) return;
    x.value = reduce ? l.x : withSpring(l.x, Spring.snappy);
    w.value = reduce ? l.w : withSpring(l.w, Spring.snappy);
  }, [value, lay, reduce, x, w]);
  const bar = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <View style={s.wrap} accessibilityRole="tablist">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}
            onLayout={(e: LayoutChangeEvent) => { const { x: lx, width } = e.nativeEvent.layout; setLay((o) => ({ ...o, [t.value]: { x: lx, w: width } })); }}>
            <Text style={[s.text, on && s.on]}>{t.label}</Text>
          </Pressable>
        );
      })}
      <Animated.View style={[s.bar, bar]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Corpus.border },
  tab: { paddingVertical: 12 },
  text: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.textMuted },
  on: { color: Corpus.text, fontFamily: Font.displayBold },
  bar: { position: 'absolute', left: 0, bottom: -1, height: 3, borderRadius: 2, backgroundColor: Corpus.text },
});

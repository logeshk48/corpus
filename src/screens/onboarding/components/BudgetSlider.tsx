import { Spring } from '@/constants/motion';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const KNOB = 28;
const PAD = KNOB / 2;

// Drag to set the monthly budget. It moves in ₹500 steps, the suggested budgets sit as marks you can tap,
// and a screen reader can step it up or down by ₹500.
export default function BudgetSlider({ value, min, max, marks, onChange }: {
  value: number; min: number; max: number; marks: { label: string; amount: number }[]; onChange: (v: number) => void;
}) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const drag = useSharedValue(false);
  const last = useRef(value);
  const span = Math.max(1, max - min);
  const toX = (v: number) => (w * (Math.min(max, Math.max(min, v)) - min)) / span;

  useEffect(() => { if (!drag.value && w) x.value = withSpring(toX(value), Spring.snappy); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value, w]);

  const emit = (px: number) => {
    const v = Math.round((min + (px / Math.max(1, w)) * span) / 500) * 500;
    const c = Math.min(max, Math.max(min, v));
    if (c !== last.current) { last.current = c; onChange(c); }
  };
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => { drag.value = true; x.value = Math.min(w, Math.max(0, e.x - PAD)); runOnJS(emit)(x.value); })
    .onChange((e) => { x.value = Math.min(w, Math.max(0, e.x - PAD)); runOnJS(emit)(x.value); })
    .onFinalize(() => { drag.value = false; });

  const fill = useAnimatedStyle(() => ({ width: x.value }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: withSpring(drag.value ? 1.15 : 1, Spring.snappy) }] }));
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));

  return (
    <View style={{ gap: 10 }}>
      <GestureDetector gesture={pan}>
        <View style={s.hit} accessible accessibilityRole="adjustable" accessibilityLabel="Monthly budget" accessibilityValue={{ text: `${formatINR(value)} a month` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 500 : -500)}>
          <View style={s.track} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            <Animated.View style={[s.fill, fill]} />
            {w > 0 && marks.map((m) => <View key={m.label} style={[s.tick, { left: toX(m.amount) - 1 }]} />)}
          </View>
          <Animated.View style={[s.knob, knob]} />
        </View>
      </GestureDetector>
      <View style={s.marks}>
        {marks.map((m) => {
          const on = m.amount === value;
          return (
            <Pressable key={m.label} onPress={() => onChange(m.amount)} style={({ pressed }) => [s.mark, on && s.markOn, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${m.label}, ${formatINR(m.amount)}`}>
              <Text style={[s.markText, on && { color: Corpus.onGold }]}>{m.label}</Text>
              <Text style={[s.markSub, on && { color: Corpus.onGold }]}>{formatINR(m.amount)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center', paddingHorizontal: PAD },
  track: { height: 8, borderRadius: 4, backgroundColor: Corpus.cardAlt },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: Corpus.gold },
  tick: { position: 'absolute', top: -3, width: 2, height: 14, borderRadius: 1, backgroundColor: Corpus.textFaint },
  knob: { position: 'absolute', left: 0, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: Corpus.card, borderWidth: 2, borderColor: Corpus.gold, shadowColor: Corpus.shadow, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  marks: { flexDirection: 'row', gap: 8 },
  mark: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: Corpus.cardAlt, gap: 2 },
  markOn: { backgroundColor: Corpus.gold },
  markText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  markSub: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
});

import { Chip, Corpus, Font, isDark, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue,
  withSpring, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Tab<T> = { value: T; label: string; icon: string; color?: string };
const STAGE = isDark ? Corpus.card : Corpus.text; // a dark control capsule in both themes
const FG = Corpus.sheen;
const PALETTE: [string, string][] = [[Chip.indigo, Chip.purple], [Chip.orange, Chip.pink], [Chip.green, Chip.teal], [Chip.teal, Chip.blue], [Chip.pink, Chip.purple]];
const FAST = { damping: 20, stiffness: 300, mass: 0.7 };
const SLOW = { damping: 22, stiffness: 150, mass: 0.9 };

function Glow({ id, a, b }: { id: string; a: string; b: string }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx="18" fill={`url(#${id})`} />
    </Svg>
  );
}

// Each tab's colour layer fades in as the pill arrives over it, so the colour morphs while it slides
function Layer({ k, mid, a, b }: { k: number; mid: SharedValue<number>; a: string; b: string }) {
  const st = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(mid.value - k)) }));
  return <Animated.View style={[StyleSheet.absoluteFill, st]}><Glow id={`pt${k}`} a={a} b={b} /></Animated.View>;
}

function TabCell<T extends string>({ t, k, on, mid, onPress }: { t: Tab<T>; k: number; on: boolean; mid: SharedValue<number>; onPress: () => void }) {
  const st = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(mid.value - k));
    return { opacity: interpolate(near, [0, 1], [0.55, 1]), transform: [{ scale: interpolate(near, [0, 1], [1, 1.04]) }] };
  });
  const icon = useAnimatedStyle(() => {
    const near = Math.max(0, 1 - Math.abs(mid.value - k));
    return { transform: [{ translateY: interpolate(near, [0, 1], [0, -1]) }, { scale: interpolate(near, [0, 1], [1, 1.15]) }] };
  });
  return (
    <Pressable onPress={onPress} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
      <Animated.View style={[s.inner, st]}>
        <Animated.View style={icon}>
          <Ionicons name={(on ? t.icon : `${t.icon}-outline`) as keyof typeof Ionicons.glyphMap} size={18} color={FG} />
        </Animated.View>
        <Text style={[s.text, on && s.on]} numberOfLines={1}>{t.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// Equal-width tabs on a dark glass capsule. The lit pill stretches toward the tab you pick and then
// catches up (leading edge fast, trailing edge slow), its colour morphs between tabs, and a short bar
// marks the active label. Reduce Motion makes it jump.
export default function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const i = Math.max(0, tabs.findIndex((t) => t.value === value));
  const cell = w > 0 ? (w - 8) / tabs.length : 0;
  const L = useSharedValue(i);
  const R = useSharedValue(i);
  const prev = useRef(i);

  useEffect(() => {
    const right = i > prev.current;
    prev.current = i;
    if (reduce) { L.value = i; R.value = i; return; }
    L.value = withSpring(i, right ? SLOW : FAST);
    R.value = withSpring(i, right ? FAST : SLOW);
  }, [i, reduce, L, R]);

  const mid = useDerivedValue(() => (L.value + R.value) / 2);
  const n = tabs.length - 1;
  const pill = useAnimatedStyle(() => {
    const l = Math.max(0, Math.min(n, L.value));
    const r = Math.max(l, Math.min(n, R.value)); // springs may overshoot; keep the pill inside the capsule
    return { left: 4 + l * cell, width: (r - l) * cell + cell };
  });
  const colors = tabs.map((t, k) => (t.color ? [t.color, PALETTE[k % PALETTE.length][1]] : PALETTE[k % PALETTE.length]) as [string, string]);
  const glow = colors[i][0];

  return (
    <View style={s.track} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {cell > 0 && (
        <Animated.View pointerEvents="none" style={[s.pill, { shadowColor: glow }, pill]}>
          {colors.map(([a, b], k) => <Layer key={k} k={k} mid={mid} a={a} b={b} />)}
          <View style={s.edge} />
          <View style={[s.beam, { backgroundColor: FG }]} />
        </Animated.View>
      )}
      {tabs.map((t, k) => <TabCell key={t.value} t={t} k={k} on={k === i} mid={mid} onPress={() => onChange(t.value)} />)}
    </View>
  );
}

const s = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: 22, backgroundColor: STAGE, borderWidth: 1, borderColor: FG + '14' },
  pill: { position: 'absolute', top: 4, bottom: 4, borderRadius: 18, overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, borderWidth: 1, borderColor: FG + '40' },
  beam: { position: 'absolute', bottom: 4, alignSelf: 'center', width: 14, height: 3, borderRadius: 2 },
  tab: { flex: 1, paddingVertical: 8 },
  inner: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  text: { fontSize: Type.small, fontFamily: Font.display, color: FG },
  on: { fontFamily: Font.displayBold },
});

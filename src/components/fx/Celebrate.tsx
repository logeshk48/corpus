import { Chip } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

// A short burst of coloured pieces for real wins (goal reached, got paid, all settled). Call celebrate() from anywhere.
let fire: (() => void) | null = null;
export const celebrate = () => fire?.();

const COLORS = [Chip.green, Chip.blue, Chip.yellow, Chip.pink, Chip.orange, Chip.indigo, Chip.teal];
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const angle = -Math.PI / 2 + ((i / 25) - 0.5) * Math.PI * 1.25 + Math.sin(i * 12.9898) * 0.18;
  const speed = 150 + ((i * 53) % 150);
  return { dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed, color: COLORS[i % COLORS.length], round: i % 3 === 0, spin: (i % 2 ? 1 : -1) * (200 + (i * 37) % 300), size: 7 + (i % 3) * 2 };
});

function Piece({ p, t }: { p: (typeof PIECES)[number]; t: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const k = t.value;
    return {
      opacity: k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3,
      transform: [{ translateX: p.dx * k }, { translateY: p.dy * k + 260 * k * k }, { rotate: `${p.spin * k}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: p.size, height: p.round ? p.size : p.size * 1.6, borderRadius: p.round ? p.size / 2 : 2, backgroundColor: p.color }, st]} />;
}

export default function CelebrateHost() {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => { fire = () => setRun((n) => n + 1); return () => { fire = null; }; }, []);
  useEffect(() => {
    if (!run || reduce) return;
    t.value = 0;
    t.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) });
    const id = setTimeout(() => setRun(0), 1400);
    return () => clearTimeout(id);
  }, [run, reduce, t]);
  if (!run || reduce) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: width / 2, top: height * 0.62 }}>
        {PIECES.map((p, i) => <Piece key={i} p={p} t={t} />)}
      </View>
    </View>
  );
}

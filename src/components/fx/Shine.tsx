import { isDark } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// A single sweep of light across a card when it appears (like tilting a bank card). Runs once, then removes itself.
// The parent needs overflow: 'hidden'.
export default function Shine({ delay = 350 }: { delay?: number }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const [done, setDone] = useState(false);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!w || reduce) return;
    x.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    const id = setTimeout(() => setDone(true), delay + 1000);
    return () => clearTimeout(id);
  }, [w, reduce, delay, x]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + x.value * (w + 320) }, { skewX: '-20deg' }] }));
  if (reduce || done) return null;
  const c = (o: number) => `rgba(255,255,255,${isDark ? o * 0.5 : o})`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w > 0 && (
        <Animated.View style={[{ position: 'absolute', top: -20, bottom: -20, left: 0, flexDirection: 'row' }, band]}>
          <View style={{ width: 28, backgroundColor: c(0.1) }} />
          <View style={{ width: 44, backgroundColor: c(0.22) }} />
          <View style={{ width: 28, backgroundColor: c(0.1) }} />
        </Animated.View>
      )}
    </View>
  );
}

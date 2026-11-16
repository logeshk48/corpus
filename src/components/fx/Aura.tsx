import { isDark } from '@/constants/theme';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const BLOB = require('../../../assets/images/bg/blob.png');

// The living background: two soft lights in the screen's colour, drifting slowly behind the title.
// Each screen has its own colour (and Today uses your money status), so you know where you are before reading.
// Pure decoration: hidden from screen readers, still when Reduce Motion is on.
export default function Aura({ color, second }: { color: string; second?: string }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduce, t]);
  const size = width * 1.15;
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -size * 0.35 + t.value * 46 }, { translateY: -size * 0.45 + t.value * 22 }, { scale: 1 + t.value * 0.12 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: width - size * 0.6 - t.value * 52 }, { translateY: -size * 0.25 + t.value * 40 }, { scale: 1.1 - t.value * 0.14 }] }));
  const strength = isDark ? 0.5 : 0.42;
  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <Animated.Image source={BLOB} style={[{ position: 'absolute', width: size, height: size, tintColor: color, opacity: strength }, a]} />
        <Animated.Image source={BLOB} style={[{ position: 'absolute', width: size * 0.85, height: size * 0.85, tintColor: second ?? color, opacity: strength * 0.75 }, b]} />
      </View>
    </Animated.View>
  );
}

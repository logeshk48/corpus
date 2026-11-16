import { EaseOut } from '@/constants/motion';
import { Corpus } from '@/constants/theme';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// A measuring jar: the level is how close you are to the goal, with marks at 25 / 50 / 75%.
// The level rises when you add money (and falls when you take some out), so you see what changed.
export default function JarFill({ level, color, width = 36, height = 46, marks = true }: {
  level: number; color: string; width?: number; height?: number; marks?: boolean;
}) {
  const body = height - 6;
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(Math.max(0, Math.min(1, level)), { duration: 700, easing: EaseOut }); }, [level, v]);
  const fill = useAnimatedStyle(() => ({ height: v.value * (body - 4) }));
  const r = Math.round(width * 0.3);
  return (
    <View style={{ width, height, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: width * 0.62, height: 5, borderRadius: 3, backgroundColor: color, marginBottom: 1 }} />
      <View style={{ width, height: body, borderRadius: r, borderWidth: 2, borderColor: color, backgroundColor: Corpus.cardAlt, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <Animated.View style={[{ backgroundColor: color, borderBottomLeftRadius: r - 2, borderBottomRightRadius: r - 2 }, fill]} />
        {marks && [0.25, 0.5, 0.75].map((m) => (
          <View key={m} style={{ position: 'absolute', right: 3, bottom: 2 + m * (body - 4), width: m === 0.5 ? width * 0.32 : width * 0.2, height: 1.5, borderRadius: 1, backgroundColor: Corpus.card, opacity: 0.9 }} />
        ))}
      </View>
    </View>
  );
}

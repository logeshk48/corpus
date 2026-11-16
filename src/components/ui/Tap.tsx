import { PRESS_SCALE, Spring } from '@/constants/motion';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const APressable = Animated.createAnimatedComponent(Pressable);

// A pressable that dips slightly under your finger and springs back (skill: scale-feedback 0.95–1.05, < 100 ms).
// Runs on the UI thread, so it stays smooth while the JS thread is busy saving.
export default function Tap({ style, children, scaleTo = PRESS_SCALE, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number;
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => { if (!reduce) s.value = withSpring(scaleTo, Spring.press); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, Spring.press); onPressOut?.(e); }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
}

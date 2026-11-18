import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const ACircle = Animated.createAnimatedComponent(Circle);

// A smooth ring drawn with SVG: a soft track, and the filled part as one stroke with round ends and a
// gentle gradient in its colour. It sweeps to its value when shown and when the value changes.
// `progress` 0–1 starts at 12 o'clock. Decoration only; the number next to it carries the meaning.
export default function ActivityRing({ size, thickness, progress, color, track }: { size: number; thickness: number; progress: number; color: string; track: string }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? progress : 0);
  useEffect(() => {
    const to = Math.min(1, Math.max(0, progress));
    p.value = reduce ? to : withTiming(to, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, reduce, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={`url(#g${id})`} strokeWidth={thickness} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} />
      </Svg>
    </View>
  );
}

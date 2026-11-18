import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const ACircle = Animated.createAnimatedComponent(Circle);
export type Slice = { id: string; value: number; color: string };

function Seg({ s, start, frac, r, c, size, thickness, p }: { s: Slice; start: number; frac: number; r: number; c: number; size: number; thickness: number; p: SharedValue<number> }) {
  const gap = Math.min(c * 0.012, c * frac * 0.3); // a hairline gap between slices
  const props = useAnimatedProps(() => {
    const len = Math.max(0, (c * frac - gap) * p.value);
    return { strokeDasharray: [len, c], strokeDashoffset: -c * start * p.value };
  });
  return <ACircle cx={size / 2} cy={size / 2} r={r} stroke={s.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" animatedProps={props} />;
}

// Share of a whole as a ring of slices (≤ 5, the skill's limit for a donut). Slices sweep round from 12 o'clock.
// Labels and amounts always sit next to it in a legend, so colour is never the only way to read it.
export default function Donut({ data, size = 132, thickness = 18, track, children }: { data: Slice[]; size?: number; thickness?: number; track: string; children?: ReactNode }) {
  const reduce = useReducedMotion();
  useId();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const p = useSharedValue(reduce ? 1 : 0);
  const key = data.map((d) => `${d.id}${Math.round(d.value)}`).join();
  useEffect(() => { p.value = reduce ? 1 : 0; if (!reduce) p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [key, reduce, p]);
  let acc = 0;
  return (
    <View style={{ width: size, height: size }}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
          {data.map((d) => {
            const frac = d.value / total;
            const start = acc;
            acc += frac;
            return <Seg key={d.id} s={d} start={start} frac={frac} r={r} c={c} size={size} thickness={thickness} p={p} />;
          })}
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

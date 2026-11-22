import { Corpus } from '@/constants/theme';
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const ACircle = Animated.createAnimatedComponent(Circle);
export type Ring = { id: string; value: number; color: string };

function Arc({ r, size, stroke, frac, color, id, i, reduce }: { r: number; size: number; stroke: number; frac: number; color: string; id: string; i: number; reduce: boolean }) {
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? frac : 0);
  useEffect(() => { p.value = reduce ? frac : withDelay(120 + i * 120, withTiming(frac, { duration: 1000, easing: Easing.out(Easing.cubic) })); }, [frac, i, reduce, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  const cx = size / 2;
  return (
    <>
      <Circle cx={cx} cy={cx} r={r} stroke={Corpus.cardAlt} strokeWidth={stroke} fill="none" />
      {/* a soft wide copy under the arc reads as a glow, on phones and the web alike */}
      <ACircle cx={cx} cy={cx} r={r} stroke={color} strokeOpacity={0.18} strokeWidth={stroke + 8} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} transform={`rotate(-90 ${cx} ${cx})`} />
      <ACircle cx={cx} cy={cx} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={props} transform={`rotate(-90 ${cx} ${cx})`} />
    </>
  );
}

// Your biggest categories as rings of light, one inside the other (like activity rings). The longest ring is
// the biggest category; the others are drawn against it. The legend beside it carries names and amounts.
export default function RadialRings({ data, size = 132, stroke = 11, gap = 4, children }: { data: Ring[]; size?: number; stroke?: number; gap?: number; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');
  const rings = data.slice(0, 4);
  const max = Math.max(...rings.map((d) => d.value), 1);
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Defs>
          {rings.map((d, i) => (
            <LinearGradient key={d.id} id={`r${uid}${i}`} x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={Corpus.sheen} stopOpacity={0.9} />
              <Stop offset="0.35" stopColor={d.color} stopOpacity={1} />
              <Stop offset="1" stopColor={d.color} stopOpacity={1} />
            </LinearGradient>
          ))}
        </Defs>
        {rings.map((d, i) => (
          <Arc key={d.id} i={i} id={`r${uid}${i}`} r={size / 2 - stroke / 2 - 4 - i * (stroke + gap)} size={size} stroke={stroke} frac={Math.max(0.02, (d.value / max) * 0.92)} color={d.color} reduce={reduce} />
        ))}
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View> : null}
    </View>
  );
}

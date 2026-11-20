import { useTween } from '@/hooks/useTween';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const APath = Animated.createAnimatedComponent(Path);

// A half-ring with a rupee number in its hollow. The ring sweeps to `fill` (0 to 1) while the number
// counts to `amount`, both on the same curve, so they land together. Used on sign-in and at the end of setup.
export default function DailyGauge({ amount, fill, label, width = 220, delay = 0, ms = 900 }: {
  amount: number; fill: number; label: string; width?: number; delay?: number; ms?: number;
}) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const stroke = Math.round(width / 18);
  const r = (width - stroke) / 2;
  const h = r + stroke;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${r + stroke / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${r + stroke / 2}`;
  const target = Math.max(0, Math.min(1, fill));
  const p = useSharedValue(reduce ? target : 0);
  const shown = useTween(amount, reduce ? 0 : ms);
  useEffect(() => {
    p.value = reduce ? target : withDelay(delay, withTiming(target, { duration: ms, easing: Easing.out(Easing.cubic) }));
  }, [target, reduce, p, delay, ms]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <View style={{ width, height: h }} accessible accessibilityLabel={`${formatINR(amount)} ${label}`}>
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        <Svg width={width} height={h}>
          <Defs>
            <LinearGradient id={`g${id}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={Chip.teal} />
              <Stop offset="1" stopColor={Corpus.income} />
            </LinearGradient>
          </Defs>
          <Path d={d} stroke={Corpus.border} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          <APath d={d} stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={props} />
        </Svg>
      </View>
      <View style={s.inside}>
        <Text style={[s.num, width > 260 && { fontSize: Type.hero }]}>{formatINR(Math.round(shown))}</Text>
        <Text style={s.sub}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  inside: { position: 'absolute', left: 0, right: 0, bottom: -4, alignItems: 'center' },
  num: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.5, ...tabular },
  sub: { fontSize: Type.small, color: Corpus.textMuted },
});

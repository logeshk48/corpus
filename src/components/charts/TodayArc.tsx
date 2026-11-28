import Jarvy from '@/components/fx/Jarvy';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);

// "What this does to today": a half-circle gauge that fills as you type an amount, against what you can
// safely spend today. Green while it fits, amber when it takes most of it, red past it. The line under it says
// it in words, so the colour is never the only signal.
export default function TodayArc({ amount, safeToday, width = 280, jar, children }: { amount: number; safeToday: number; width?: number; jar?: boolean; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const stroke = 12;
  const r = (width - stroke) / 2;
  const h = r + stroke;
  const cx = width / 2, cy = r + stroke / 2;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${cy}`;
  const share = safeToday > 0 ? amount / safeToday : amount > 0 ? 1 : 0;
  const target = Math.min(1, Math.max(0, share));
  const p = useSharedValue(0);
  useEffect(() => { p.value = reduce ? target : withSpring(target, { damping: 18, stiffness: 140 }); }, [target, reduce, p]);
  const glow = useSharedValue(0);
  useEffect(() => { glow.value = reduce ? 0 : withTiming(share > 1 ? 1 : 0, { duration: 300, easing: Easing.out(Easing.quad) }); }, [share, reduce, glow]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  const knobProps = useAnimatedProps(() => {
    const a = Math.PI * (1 - p.value);
    return { cx: cx + r * Math.cos(a), cy: cy - r * Math.sin(a), opacity: p.value > 0.001 ? 1 : 0 };
  });
  const left = safeToday - amount;
  const over = left < 0;
  const line = amount <= 0
    ? `${formatINR(Math.max(0, Math.round(safeToday)))} is safe to spend today`
    : over ? `${formatINR(Math.round(-left))} over what you can spend today`
    : `Leaves ${formatINR(Math.round(left))} for today`;
  // Jarvy holds what's left of today: it drains as you type and looks worried past the line
  const jarLevel = safeToday > 0 ? Math.max(0.04, Math.min(0.92, left / safeToday)) * 0.9 : 0.04;
  const mood = amount <= 0 ? 'calm' : over ? 'worried' : share > 0.75 ? 'look' : 'calm';
  const tone = amount <= 0 ? Corpus.textMuted : over ? Corpus.danger : share > 0.75 ? Corpus.warning : Corpus.income;
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View style={{ width, height: h }}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={h}>
        <Defs>
          <LinearGradient id={`a${id}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={Corpus.income} />
            <Stop offset="0.6" stopColor={Corpus.warning} />
            <Stop offset="1" stopColor={Corpus.danger} />
          </LinearGradient>
        </Defs>
        <Path d={d} stroke={Corpus.cardAlt} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        <APath d={d} stroke={`url(#a${id})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={arcProps} />
        <ACircle r={stroke * 0.85} fill={Corpus.text} stroke={Corpus.bg} strokeWidth={3} animatedProps={knobProps} />
      </Svg>
      </View>
        {/* whatever sits in the hollow of the arc (the amount on Add) */}
        <View style={s.inside}>{children}</View>
      </View>
      <View style={s.line} accessibilityRole="text" accessibilityLabel={line} accessibilityLiveRegion="polite">
        {jar ? <Jarvy mood={mood} level={jarLevel} color={tone === Corpus.textMuted ? Corpus.income : tone} size={32} /> : <View style={[s.dot, { backgroundColor: tone }]} />}
        <Text style={[s.text, { color: amount > 0 ? Corpus.text : Corpus.textMuted }]}>{line}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  inside: { position: 'absolute', left: 0, right: 0, bottom: -6, alignItems: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: Type.body, fontFamily: Font.display, ...tabular },
});

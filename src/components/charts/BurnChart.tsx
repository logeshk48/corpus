import { Chip, Corpus, Font, Type } from '@/constants/theme';
import { compactINR } from '@/utils/format';
import { useEffect, useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const APath = Animated.createAnimatedComponent(Path);

// The month as a race against the budget: your spending adds up day by day (the filled line), the straight
// dashed line is spending evenly to the budget, and a dotted line carries on to where you'll likely end.
// Green while the finish is under the budget, red when it's over. The card under it says the same in words.
export default function BurnChart({ daily, days, today, budget, projected, height = 150 }: {
  daily: number[]; days: number; today: number; budget?: number; projected: number; height?: number;
}) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const [w, setW] = useState(0);
  const cum: number[] = [];
  daily.slice(0, today).reduce((a, v, i) => (cum[i] = a + v), 0);
  const top = Math.max(budget ?? 0, projected, cum[cum.length - 1] ?? 0, 1) * 1.08;
  const pad = 6;
  const x = (d: number) => pad + ((d - 1) / Math.max(1, days - 1)) * (w - pad * 2);
  const y = (v: number) => height - 4 - (v / top) * (height - 14);
  const over = budget ? projected > budget : false;
  const tone = budget ? (over ? Corpus.danger : Corpus.income) : Chip.blue;
  const line = cum.map((v, i) => `${i ? 'L' : 'M'} ${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = cum.length ? `${line} L ${x(cum.length).toFixed(1)} ${height} L ${x(1).toFixed(1)} ${height} Z` : '';
  const len = cum.length * (w / Math.max(1, days)) * 2.2 + 200;
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) { p.value = 0; p.value = withDelay(120, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) })); } }, [w, today, reduce, p]);
  const draw = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  const last = cum[cum.length - 1] ?? 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: height + 18 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={tone} stopOpacity={0.28} />
              <Stop offset="1" stopColor={tone} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {budget ? <Line x1={x(1)} y1={y(0)} x2={x(days)} y2={y(budget)} stroke={Corpus.textFaint} strokeWidth={1.5} strokeDasharray="5 5" /> : null}
          {budget ? <Line x1={x(1)} y1={y(budget)} x2={x(days)} y2={y(budget)} stroke={Corpus.border} strokeWidth={1} /> : null}
          {area ? <Path d={area} fill={`url(#b${id})`} /> : null}
          {line ? <APath d={line} stroke={tone} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len} ${len}`} animatedProps={draw} /> : null}
          {today < days && cum.length ? <Line x1={x(today)} y1={y(last)} x2={x(days)} y2={y(projected)} stroke={tone} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" /> : null}
          {cum.length ? <Circle cx={x(today)} cy={y(last)} r={5} fill={tone} stroke={Corpus.card} strokeWidth={2} /> : null}
          {today < days ? <Circle cx={x(days)} cy={y(projected)} r={4} fill={Corpus.card} stroke={tone} strokeWidth={2} /> : null}
        </Svg>
      )}
      <View style={s.axis}>
        <Text style={s.tick}>1st</Text>
        {budget ? <Text style={s.tick}>Budget {compactINR(budget)}</Text> : null}
        <Text style={s.tick}>{days}th</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tick: { fontSize: Type.small, color: Corpus.textMuted, fontFamily: Font.display },
});

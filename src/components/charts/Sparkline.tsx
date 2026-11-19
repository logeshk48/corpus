import { Corpus } from '@/constants/theme';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

// A tiny price line, like the ones next to every stock in a broker app: green if it ended higher than it
// started (or than `base`, the previous close), red if lower. Decoration next to the real numbers.
export default function Sparkline({ values, width = 64, height = 28, base, fill = true }: { values: number[]; width?: number; height?: number; base?: number | null; fill?: boolean }) {
  const id = useId().replace(/:/g, '');
  if (values.length < 2) return <View style={{ width, height }} />;
  const ref = base ?? values[0];
  const lo = Math.min(...values, ref), hi = Math.max(...values, ref);
  const span = hi - lo || 1;
  const up = values[values.length - 1] >= ref;
  const color = up ? Corpus.income : Corpus.danger;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => 2 + (1 - (v - lo) / span) * (height - 4);
  const line = values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.3} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {base != null && <Line x1={0} x2={width} y1={y(ref)} y2={y(ref)} stroke={Corpus.border} strokeWidth={1} strokeDasharray="2 3" />}
          {fill && <Path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#s${id})`} />}
          <Path d={line} stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}

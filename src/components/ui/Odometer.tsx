import { useEffect } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Wheel({ d, i, lh, style }: { d: number; i: number; lh: number; style: TextStyle }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(-d * lh);
  useEffect(() => {
    y.value = reduce ? -d * lh : withDelay(i * 40, withTiming(-d * lh, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [d, i, lh, reduce, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: lh, overflow: 'hidden' }}>
      <Animated.View style={st}>
        {DIGITS.map((n) => <Text key={n} style={[style, { height: lh, lineHeight: lh }]}>{n}</Text>)}
      </Animated.View>
    </View>
  );
}

// A number whose digits roll to the new value, like a mechanical counter.
// Digits are matched from the right, so ₹7,545 to ₹20,550 rolls each place instead of redrawing.
export default function Odometer({ value, style, lineHeight, label }: { value: string; style: TextStyle; lineHeight: number; label?: string }) {
  const chars = value.split('');
  return (
    <View style={s.row} accessible accessibilityLabel={label ?? value}>
      {chars.map((c, k) => {
        const fromRight = chars.length - k;
        return /\d/.test(c)
          ? <Wheel key={`d${fromRight}`} d={Number(c)} i={k} lh={lineHeight} style={style} />
          : <Text key={`c${fromRight}${c}`} style={[style, { height: lineHeight, lineHeight }]}>{c}</Text>;
      })}
    </View>
  );
}

const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-start' } });

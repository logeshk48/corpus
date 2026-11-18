import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutUp, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// Indian grouping as you type: 120000 → 1,20,000 (the paise part stays as typed)
const group = (a: string) => {
  if (!a) return '';
  const [w, d] = a.split('.');
  const n = Number(w || '0').toLocaleString('en-IN');
  return d !== undefined ? `${n}.${d}` : n;
};

// The amount, big. Each digit springs up into place and pops out when deleted; the size steps down as it grows.
// `shake` is bumped by the parent to nudge you when Save is tapped without an amount.
export default function AmountDisplay({ amount, income, shake }: { amount: string; income: boolean; shake: number }) {
  const reduce = useReducedMotion();
  const text = group(amount);
  const size = text.length <= 5 ? Type.entry + 28 : text.length <= 7 ? Type.entry + 16 : text.length <= 9 ? Type.entry + 4 : Type.entry - 6;
  const color = !amount ? Corpus.textFaint : income ? Corpus.income : Corpus.text;

  const caret = useSharedValue(1);
  useEffect(() => { if (!reduce) caret.value = withRepeat(withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })), -1); }, [reduce, caret]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const x = useSharedValue(0);
  useEffect(() => {
    if (!shake || reduce) return;
    x.value = withSequence(...[-12, 10, -8, 6, 0].map((v) => withTiming(v, { duration: 55, easing: Easing.linear })));
  }, [shake, reduce, x]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const enter = reduce ? undefined : FadeInDown.springify().damping(14).stiffness(260);
  const exit = reduce ? undefined : FadeOutUp.duration(120);
  return (
    <Animated.View style={[s.wrap, shakeStyle]} accessibilityRole="text" accessibilityLabel={amount ? `${income ? 'Money in' : 'Amount'} ₹${text}` : 'Amount, nothing entered'}>
      <Text style={[s.sym, { fontSize: size * 0.55, color: amount ? color : Corpus.textFaint }]}>{income ? '+₹' : '₹'}</Text>
      <Animated.View style={s.row} layout={reduce ? undefined : LinearTransition.springify().damping(18)}>
        {text ? text.split('').map((ch, i) => (
          <Animated.Text key={`${i}-${ch}`} entering={enter} exiting={exit} style={[s.digit, { fontSize: size, lineHeight: size * 1.12, color }]}>{ch}</Animated.Text>
        )) : <Text style={[s.digit, { fontSize: size, lineHeight: size * 1.12, color }]}>0</Text>}
      </Animated.View>
      <Animated.View style={[s.caret, { height: size * 0.8, backgroundColor: income ? Corpus.income : Corpus.text }, caretStyle]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  row: { flexDirection: 'row', alignItems: 'center' },
  sym: { fontFamily: Font.display, marginRight: 4 },
  digit: { fontFamily: Font.displayBold, letterSpacing: -1.5, ...tabular },
  caret: { width: 3, borderRadius: 2, marginLeft: 4 },
});

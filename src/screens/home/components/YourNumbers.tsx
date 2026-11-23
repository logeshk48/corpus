import LiquidJar from '@/components/charts/LiquidJar';
import RadialRings from '@/components/charts/RadialRings';
import Sparkline from '@/components/charts/Sparkline';
import { Tap } from '@/components/ui';
import { Chip, Corpus, Font, isDark, tabular, Type } from '@/constants/theme';
import { compactINR, formatINR } from '@/utils/format';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export type NumberCard = {
  key: string;
  label: string;
  value: string;
  line: string;          // the one curious sentence: what changed, what it means
  tone?: 'up' | 'down' | 'neutral';
  visual?: ReactNode;    // a small picture of the number
  hero?: boolean;        // the headline card: wider, with a glowing gradient edge
  onPress: () => void;
};

// Holo cards are always dark glass (the darkest surface in either theme) so the numbers glow on them
const HOLO_BG = isDark ? Corpus.card : Corpus.text;
const TONE = { up: Chip.green, down: Chip.red, neutral: Corpus.sheen };
const ACCENT: Record<string, string> = { nw: Chip.indigo, score: Chip.purple, vs: Chip.orange, kept: Chip.teal, jar: Chip.yellow, debt: Chip.pink };
const W = 236, HERO_W = 284, GAP = 12, SPEED = 26; // px a second

function Holo({ c }: { c: NumberCard }) {
  const id = useId().replace(/:/g, '');
  const a = ACCENT[c.key] ?? Chip.blue;
  const w = c.hero ? HERO_W : W;
  return (
    <Tap onPress={c.onPress} scaleTo={0.97} style={[s.card, { width: w, backgroundColor: HOLO_BG, shadowColor: a }]} accessibilityRole="button" accessibilityLabel={`${c.label}: ${c.value}. ${c.line}`}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`g${id}`} cx="85%" cy="0%" r="75%">
              <Stop offset="0" stopColor={a} stopOpacity={0.55} />
              <Stop offset="1" stopColor={a} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id={`e${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={a} stopOpacity={0.9} />
              <Stop offset="0.5" stopColor={Corpus.sheen} stopOpacity={0.12} />
              <Stop offset="1" stopColor={Chip.teal} stopOpacity={0.7} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx="24" fill={`url(#g${id})`} />
          {/* a faint grid, like a display */}
          {Array.from({ length: 8 }, (_, k) => <Line key={`v${k}`} x1={(k + 1) * 32} y1="0" x2={(k + 1) * 32} y2="100%" stroke={Corpus.sheen} strokeOpacity={0.04} />)}
          {Array.from({ length: 6 }, (_, k) => <Line key={`h${k}`} x1="0" y1={(k + 1) * 32} x2="100%" y2={(k + 1) * 32} stroke={Corpus.sheen} strokeOpacity={0.04} />)}
          <Rect x="0.75" y="0.75" width={w - 1.5} height="99%" rx="23.5" fill="none" stroke={`url(#e${id})`} strokeWidth={1.5} />
        </Svg>
      </View>
      <View style={s.top}>
        <View style={[s.dot, { backgroundColor: a, shadowColor: a }]} />
        <Text style={s.label}>{c.label}</Text>
      </View>
      <Text style={[s.value, c.hero && s.heroValue]} numberOfLines={1}>{c.value}</Text>
      <Text style={[s.line, { color: TONE[c.tone ?? 'neutral'] }, (c.tone ?? 'neutral') === 'neutral' && { opacity: 0.7 }]} numberOfLines={2}>{c.line}</Text>
      {c.visual ? <View style={s.visual}>{c.visual}</View> : null}
    </Tap>
  );
}

// "Your numbers": the figures people are most curious about, as a row of glowing cards that glides past on
// its own and loops like a train. Touch or swipe to take over; it carries on a moment after you let go.
// Reduce Motion: it never moves on its own.
export default function YourNumbers({ cards }: { cards: NumberCard[] }) {
  const reduce = useReducedMotion();
  const row = useSharedValue(0); // width of one full set of cards
  const x = useSharedValue(0);
  const held = useSharedValue(0);
  const until = useSharedValue(0);
  useFrameCallback((f) => {
    if (row.value <= 0) return;
    const now = f.timestamp;
    if (until.value === -1) until.value = now + 2500; // just let go: wait a moment before gliding again
    if (!reduce && !held.value && now > until.value) x.value -= ((f.timeSincePreviousFrame ?? 16) / 1000) * SPEED;
    // wrap so the second copy takes over seamlessly
    if (x.value <= -row.value) x.value += row.value;
    if (x.value > 0) x.value -= row.value;
  });
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onBegin(() => { held.value = 1; })
    .onChange((e) => { x.value += e.changeX; })
    .onFinalize(() => { held.value = 0; until.value = -1; });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (!cards.length) return null;
  const set = (copy: number) => cards.map((c) => (
    <View key={`${copy}-${c.key}`} style={{ marginRight: GAP }} accessibilityElementsHidden={copy > 0} importantForAccessibility={copy > 0 ? 'no-hide-descendants' : 'auto'}>
      <Holo c={c} />
    </View>
  ));
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.title} accessibilityRole="header">Your numbers</Text>
      <GestureDetector gesture={pan}>
        <View style={s.viewport}>
          <Animated.View style={[{ flexDirection: 'row' }, style]}>
            <View style={{ flexDirection: 'row' }} onLayout={(e) => { row.value = e.nativeEvent.layout.width; }}>{set(0)}</View>
            <View style={{ flexDirection: 'row' }}>{set(1)}</View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

// Small pictures for the cards
export const NetWorthSpark = ({ values }: { values: number[] }) => (values.length > 1 ? <Sparkline values={values} width={250} height={46} /> : null);
export const ScoreRing = ({ score, color }: { score: number; color: string }) => (
  <RadialRings size={56} stroke={8} data={[{ id: 's', value: 1, frac: score / 100, color }]} />
);
export const JarVisual = ({ level, color }: { level: number; color: string }) => <LiquidJar level={level} color={color} width={40} height={52} marks />;
export function Versus({ now, then, nowLabel, thenLabel }: { now: number; then: number; nowLabel: string; thenLabel: string }) {
  const max = Math.max(now, then, 1);
  return (
    <View style={{ gap: 6 }}>
      {[[thenLabel, then, Corpus.sheen], [nowLabel, now, now > then ? Chip.red : Chip.green]].map(([l, v, c]) => (
        <View key={String(l)} style={s.vsRow}>
          <Text style={s.vsLabel}>{l}</Text>
          <View style={s.vsTrack}><View style={[s.vsFill, { width: `${(Number(v) / max) * 100}%`, backgroundColor: String(c) }]} /></View>
          <Text style={s.vsVal}>{compactINR(Number(v))}</Text>
        </View>
      ))}
    </View>
  );
}
export const fmtDelta = (n: number) => `${n >= 0 ? 'up' : 'down'} ${formatINR(Math.abs(Math.round(n)))}`;

const s = StyleSheet.create({
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  viewport: { marginHorizontal: -16, paddingLeft: 16, overflow: 'hidden', paddingVertical: 10, marginVertical: -10 },
  card: { minHeight: 190, borderRadius: 24, padding: 16, gap: 4, overflow: 'hidden', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.sheen, opacity: 0.75, letterSpacing: 0.2 },
  value: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.sheen, letterSpacing: -0.6, marginTop: 4, ...tabular },
  heroValue: { fontSize: Type.amount },
  line: { fontSize: Type.body, lineHeight: 18, fontFamily: Font.display, ...tabular },
  visual: { marginTop: 'auto', paddingTop: 8 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsLabel: { width: 34, fontSize: Type.small, color: Corpus.sheen, opacity: 0.7 },
  vsTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Corpus.sheen + '22', overflow: 'hidden' },
  vsFill: { height: 8, borderRadius: 4 },
  vsVal: { width: 48, textAlign: 'right', fontSize: Type.small, fontFamily: Font.display, color: Corpus.sheen, ...tabular },
});

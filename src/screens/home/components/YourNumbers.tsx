import LiquidJar from '@/components/charts/LiquidJar';
import RadialRings from '@/components/charts/RadialRings';
import { Tap } from '@/components/ui';
import CardArt from './CardArt';
import { Corpus, Font, Pastel, tabular, Type, type PastelName } from '@/constants/theme';
import { compactINR, formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type ScrollView } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, Extrapolation, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export type Ink = { fg: string; icon: string; track: string };
export type NumberCard = {
  key: string;
  label: string;
  value: string;
  line: string;                 // the one sentence: what changed, what it means
  tone?: 'up' | 'down' | 'neutral';
  visual?: (ink: Ink) => ReactNode;
  hero?: boolean;               // the headline card: a bigger number
  side?: boolean;               // draw the picture beside the number instead of along the bottom
  onPress: () => void;
};

// One soft colour per card, the same pastel family as the Insights notes. Colour here is identity,
// not status: up and down are carried by the arrow and the words.
const TONE_OF: Record<string, PastelName> = { nw: 'lilac', score: 'sky', vs: 'peach', kept: 'mint', jar: 'butter', debt: 'rose' };
const ORDER: PastelName[] = ['lilac', 'sky', 'peach', 'mint', 'butter', 'rose'];
const GAP = 12;
const PAD = 16;
const AUTO_MS = 5000;   // glide to the next card this often
const REST_MS = 7000;   // after you touch the row, leave it alone this long

function Card({ c, i, width }: { c: NumberCard; i: number; width: number }) {
  const t = Pastel[TONE_OF[c.key] ?? ORDER[i % ORDER.length]];
  const ink: Ink = { fg: t.fg, icon: t.icon, track: t.fg + '1F' };
  const arrow = c.tone === 'up' ? 'arrow-up' : c.tone === 'down' ? 'arrow-down' : null;
  return (
    <Tap onPress={c.onPress} scaleTo={0.98} style={[s.card, { width, backgroundColor: t.bg }]} accessibilityRole="button" accessibilityLabel={`${c.label}: ${c.value}. ${c.line}`}>
      <CardArt kind={c.key} color={t.icon} />
      <View style={s.top}>
        <Text style={[s.label, { color: t.fg }]} numberOfLines={1}>{c.label}</Text>
        <Ionicons name="arrow-forward" size={16} color={t.fg} style={{ opacity: 0.45, transform: [{ rotate: '-45deg' }] }} />
      </View>
      <View style={s.valueRow}>
        <Text style={[s.value, c.hero && s.heroValue, { color: t.fg }]} numberOfLines={1}>{c.value}</Text>
        {c.side && c.visual ? c.visual(ink) : null}
      </View>
      <View style={s.lineRow}>
        {arrow && (
          <View style={[s.chip, { backgroundColor: ink.track }]}>
            <Ionicons name={arrow} size={12} color={t.fg} />
          </View>
        )}
        <Text style={[s.line, { color: t.fg }]} numberOfLines={2}>{c.line}</Text>
      </View>
      {c.visual && !c.side ? <View style={s.visual}>{c.visual(ink)}</View> : null}
    </Tap>
  );
}

function Dot({ k, x, step }: { k: number; x: SharedValue<number>; step: number }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.value / step - k);
    const on = interpolate(d, [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 6 + on * 14, opacity: 0.25 + on * 0.75 };
  });
  return <Animated.View style={[s.dot, st]} />;
}

// "Your numbers": the figures people are most curious about, one soft card each. Swipe moves one card at
// a time and lands cleanly; on its own the row glides to the next card every few seconds and waits
// while you are touching it. Reduce Motion: it never moves on its own.
export default function YourNumbers({ cards }: { cards: NumberCard[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<ScrollView>(null);
  const [vw, setVw] = useState(0);
  const x = useSharedValue(0);
  const idx = useRef(0);
  const touched = useRef(0);
  const width = vw ? Math.round(vw * 0.76) : 0;
  const step = width + GAP;

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  const settle = (offset: number) => { if (step) idx.current = Math.round(offset / step); };

  useEffect(() => {
    if (reduce || cards.length < 2 || !step) return;
    const id = setInterval(() => {
      if (Date.now() - touched.current < REST_MS) return;
      const next = (Math.round(x.value / step) + 1) % cards.length;
      idx.current = next;
      ref.current?.scrollTo({ x: next * step, animated: true });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reduce, cards.length, step, x]);

  if (!cards.length) return null;
  const web = Platform.OS === 'web';
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.title} accessibilityRole="header">Your numbers</Text>
      <View style={s.bleed} onLayout={(e) => setVw(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.ScrollView
            ref={ref as never}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            snapToInterval={step}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onTouchStart={() => { touched.current = Date.now(); }}
            onScrollBeginDrag={() => { touched.current = Date.now(); }}
            onMomentumScrollEnd={(e) => { touched.current = Date.now(); settle(e.nativeEvent.contentOffset.x); }}
            style={web ? ({ scrollSnapType: 'x mandatory' } as object) : undefined}
            contentContainerStyle={{ paddingHorizontal: PAD, gap: GAP }}
          >
            {cards.map((c, i) => (
              <View key={c.key} style={web ? ({ scrollSnapAlign: 'start', scrollMarginLeft: PAD } as object) : undefined}>
                <Card c={c} i={i} width={width} />
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </View>
      {cards.length > 1 && step > 0 && (
        <View style={s.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {cards.map((c, k) => <Dot key={c.key} k={k} x={x} step={step} />)}
        </View>
      )}
    </View>
  );
}

// Small pictures, drawn in the card's own ink
export function NetWorthLine({ values, ink }: { values: number[]; ink: Ink }) {
  const id = useId().replace(/:/g, '');
  if (values.length < 2) return null;
  const W = 200, H = 40;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, 4 + (1 - (v - lo) / span) * (H - 8)]);
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ink.icon} stopOpacity={0.28} />
          <Stop offset="1" stopColor={ink.icon} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#a${id})`} />
      <Path d={d} stroke={ink.icon} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </Svg>
  );
}
export const ScoreRing = ({ score, ink }: { score: number; ink: Ink }) => (
  <RadialRings size={48} stroke={7} data={[{ id: 's', value: 1, frac: Math.max(0.02, score / 100), color: ink.icon, track: ink.track }]} />
);
export const JarVisual = ({ level, ink }: { level: number; ink: Ink }) => <LiquidJar level={level} color={ink.icon} width={34} height={44} marks />;
export function Meter({ frac, ink, left, right, mark }: { frac: number; ink: Ink; left?: string; right?: string; mark?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={[s.meter, { backgroundColor: ink.track }]}>
        <View style={[s.meterFill, { width: `${Math.max(0, Math.min(1, frac)) * 100}%`, backgroundColor: ink.icon }]} />
        {mark != null && <View style={[s.mark, { left: `${mark * 100}%`, backgroundColor: ink.fg }]} />}
      </View>
      {(left || right) && (
        <View style={s.meterLabels}>
          <Text style={[s.small, { color: ink.fg }]}>{left}</Text>
          <Text style={[s.small, { color: ink.fg }]}>{right}</Text>
        </View>
      )}
    </View>
  );
}
export function Versus({ now, then, nowLabel, thenLabel, ink }: { now: number; then: number; nowLabel: string; thenLabel: string; ink: Ink }) {
  const max = Math.max(now, then, 1);
  return (
    <View style={{ gap: 6 }}>
      {([[thenLabel, then, 0.45], [nowLabel, now, 1]] as const).map(([l, v, o]) => (
        <View key={l} style={s.vsRow}>
          <Text style={[s.vsLabel, { color: ink.fg }]}>{l}</Text>
          <View style={[s.meter, { flex: 1, backgroundColor: ink.track }]}>
            <View style={[s.meterFill, { width: `${(v / max) * 100}%`, backgroundColor: ink.icon, opacity: o }]} />
          </View>
          <Text style={[s.vsVal, { color: ink.fg }]}>{compactINR(v)}</Text>
        </View>
      ))}
    </View>
  );
}
export const fmtDelta = (n: number) => `${n >= 0 ? 'Up' : 'Down'} ${formatINR(Math.abs(Math.round(n)))}`;

const s = StyleSheet.create({
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  bleed: { marginHorizontal: -PAD },
  card: { minHeight: 184, borderRadius: 26, padding: 18, gap: 6, overflow: 'hidden' },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, fontSize: Type.body, fontFamily: Font.display, opacity: 0.75 },
  value: { flexShrink: 1, fontSize: Type.h1, fontFamily: Font.displayBold, letterSpacing: -0.8, marginTop: 2, ...tabular },
  heroValue: { fontSize: Type.amount, letterSpacing: -1.2 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  chip: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  line: { flex: 1, fontSize: Type.body, lineHeight: 18, opacity: 0.85, ...tabular },
  visual: { marginTop: 'auto', paddingTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3, backgroundColor: Corpus.text },
  meter: { height: 8, borderRadius: 4, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4 },
  mark: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: Type.small, opacity: 0.75, ...tabular },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsLabel: { width: 34, fontSize: Type.small, opacity: 0.75 },
  vsVal: { width: 46, textAlign: 'right', fontSize: Type.small, fontFamily: Font.display, ...tabular },
});

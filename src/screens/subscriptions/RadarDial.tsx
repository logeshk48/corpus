import { CategoryChip, Chip, Font, Pastel, tabular, Type } from '@/constants/theme';
import { Tap } from '@/components/ui';
import type { Sub } from '@/utils/subscriptions';
import { formatINR } from '@/utils/format';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

const S = 260;           // the dial's box
const C = S / 2;
const R = 88;            // the ring the dots sit on
const DAYS = 30;
const ink = Pastel.lilac;

const at = (day: number, r: number) => {
  const a = ((-90 + (day * 360) / DAYS) * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};
const when = (d: number) => (d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`);

// The next 30 days as a clock face: today at the top, going round clockwise.
// Each plan is a dot on the day it charges, bigger when it costs more. Tap a dot to read it.
export default function RadarDial({ coming, monthly, picked, onPick }: { coming: Sub[]; monthly: number; picked: string | null; onPick: (k: string | null) => void }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...coming.map((s) => s.amount));
  const perDay = new Map<number, number>();
  const dots = coming.map((s) => {
    const day = Math.max(0, s.daysAway ?? 0);
    const k = perDay.get(day) ?? 0;
    perDay.set(day, k + 1);
    const size = Math.round(16 + 12 * Math.sqrt(s.amount / max));
    const p = at(day, R + [0, -22, 22][k % 3]);
    return { s, size, ...p };
  });
  const sel = coming.find((s) => s.key === picked) ?? null;

  return (
    <View style={st.box}>
      <Svg width={S} height={S} aria-hidden>
        <Circle cx={C} cy={C} r={R} stroke={ink.icon} strokeOpacity={0.28} strokeWidth={2} fill="none" />
        {Array.from({ length: DAYS }, (_, i) => {
          const long = i === 0 ? 14 : i % 7 === 0 ? 9 : 5;
          const a = at(i, R + 10);
          const b = at(i, R + 10 + long);
          return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i === 0 ? ink.fg : ink.icon} strokeOpacity={i === 0 ? 1 : 0.55} strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />;
        })}
      </Svg>

      {[7, 14, 21].map((d) => {
        const p = at(d, R + 36);
        return <Text key={d} style={[st.mark, { left: p.x - 24, top: p.y - 8 }]}>{d} days</Text>;
      })}

      <View style={st.center} pointerEvents="none">
        {sel ? (
          <>
            <Text style={st.cLabel} numberOfLines={1}>{sel.name}</Text>
            <Text style={st.cBig}>{formatINR(sel.amount)}</Text>
            <Text style={st.cSoft}>{when(sel.daysAway ?? 0)}</Text>
          </>
        ) : (
          <>
            <Text style={st.cLabel}>Plans cost you</Text>
            <Text style={st.cBig}>{formatINR(monthly)}</Text>
            <Text style={st.cSoft}>a month</Text>
          </>
        )}
      </View>

      {dots.map(({ s, size, x, y }, i) => {
        const on = s.key === picked;
        return (
          <Animated.View key={s.key} entering={reduce ? undefined : ZoomIn.delay(200 + i * 70).duration(320)} style={[st.dotWrap, { left: x - 22, top: y - 22 }]}>
            <Tap onPress={() => onPick(on ? null : s.key)} scaleTo={0.9} style={st.hit}
              accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${s.name}, ${formatINR(s.amount)}, ${when(s.daysAway ?? 0)}`}>
              <View style={[st.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: CategoryChip[s.category] ?? Chip.purple }, s.found && st.dotFound, on && st.dotOn]} />
            </Tap>
          </Animated.View>
        );
      })}

      <Text style={[st.today, { left: C - 30, top: 0 }]}>Today</Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { width: S, height: S, alignSelf: 'center' },
  mark: { position: 'absolute', width: 48, textAlign: 'center', fontSize: Type.micro, color: ink.fg, opacity: 0.7 },
  today: { position: 'absolute', width: 60, textAlign: 'center', fontSize: Type.micro, fontFamily: Font.display, color: ink.fg },
  center: { position: 'absolute', left: C - 62, top: C - 46, width: 124, height: 92, alignItems: 'center', justifyContent: 'center' },
  cLabel: { fontSize: Type.small, color: ink.fg, opacity: 0.8, maxWidth: 120 },
  cBig: { fontSize: Type.h1, fontFamily: Font.displayBold, color: ink.fg, letterSpacing: -0.6, ...tabular },
  cSoft: { fontSize: Type.h3, fontFamily: Font.serif, color: ink.fg, marginTop: -4 },
  dotWrap: { position: 'absolute', width: 44, height: 44 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { borderWidth: 2.5, borderColor: ink.bg },
  dotFound: { borderStyle: 'dashed', borderColor: ink.fg },
  dotOn: { borderColor: ink.fg, borderWidth: 3 },
});

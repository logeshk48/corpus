import BurnChart from '@/components/charts/BurnChart';
import { CategoryChip, Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { compactINR, formatINR } from '@/utils/format';
import type { categoryMovers, monthPace, weekdayPattern } from '@/utils/insightsMore';
import { WEEKDAYS } from '@/utils/insightsMore';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, ZoomIn } from 'react-native-reanimated';
import { useEffect, useId, useState } from 'react';
import { findCategory } from '@/constants/categories';
import type { Transaction } from '@/types/transaction';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Where this month is heading: spent so far against the budget, a tick for where even spending would be
// today, and the month-end estimate in words.
export function Pace({ p, daily }: { p: ReturnType<typeof monthPace>; daily: number[] }) {
  const over = p.budget ? p.projected - p.budget : 0;
  const tone = p.budget ? (over > 0 ? Corpus.danger : Corpus.income) : Corpus.text;
  return (
    <View style={{ gap: 12 }}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Spent so far</Text>
          <Text style={s.big}>{formatINR(p.spent)}</Text>
        </View>
        {p.isCurrent && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Heading for</Text>
            <Text style={[s.mid, { color: tone }]}>{formatINR(p.projected)}</Text>
          </View>
        )}
      </View>
      <BurnChart daily={daily} days={p.days} today={p.day} budget={p.budget} projected={p.projected} />
      <View style={s.legend}>
        <View style={[s.swatch, { backgroundColor: tone }]} /><Text style={s.tiny}>You</Text>
        {p.budget ? (<><View style={[s.swatch, s.dash]} /><Text style={s.tiny}>Even spending to your budget</Text></>) : null}
      </View>
      <Text style={s.text}>
        {!p.isCurrent
          ? p.budget ? (p.spent > p.budget ? `Ended ${formatINR(p.spent - p.budget)} over budget.` : `Ended ${formatINR(p.budget - p.spent)} under budget.`) : `About ${formatINR(Math.round(p.spent / p.days))} a day.`
          : p.budget
            ? over > 0
              ? `At this pace you go ${formatINR(over)} over. Keep to ${formatINR(Math.round(p.perDayLeft ?? 0))} a day for the ${p.days - p.day + 1} days left to stay inside.`
              : `On pace to finish ${formatINR(-over)} under budget. You can spend about ${formatINR(Math.round(p.perDayLeft ?? 0))} a day for the rest of the month.`
            : `You spend about ${formatINR(Math.round(p.daily))} on a usual day. Set a monthly budget in Settings to see if that fits.`}
      </Text>
    </View>
  );
}

// A bar that grows up from the floor when it first shows, a beat after the one before it
function Grow({ h, color, i, opacity = 1 }: { h: number; color: string; i: number; opacity?: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? h : 0);
  useEffect(() => { v.value = reduce ? h : withDelay(i * 60, withSpring(h, { damping: 16, stiffness: 120 })); }, [h, i, reduce, v]);
  const st = useAnimatedStyle(() => ({ height: v.value }));
  const id = useId().replace(/:/g, '');
  return (
    <Animated.View style={[s.weekBar, { opacity, overflow: 'hidden' }, st]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Corpus.sheen} stopOpacity={0.3} />
            <Stop offset="0.25" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#g${id})`} />
      </Svg>
    </Animated.View>
  );
}

// Little spends as dots, one per spend, in its category's colour. Tap a dot to see what it was.
export function SmallDots({ list, total, under, share }: { list: Transaction[]; total: number; under: number; share: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const shown = list.slice(-60);
  const t = sel != null ? shown[sel] : null;
  return (
    <View style={{ gap: 12 }}>
      <View style={s.dots} accessibilityLabel={`${list.length} spends under ${under} rupees`}>
        {shown.map((x, k) => {
          const c = CategoryChip[x.category] ?? Chip.yellow;
          const on = sel === k;
          return (
            <Pressable key={x.id} onPress={() => setSel(on ? null : k)} hitSlop={3} accessibilityLabel={`${x.note || 'Spend'} ${formatINR(x.amount)}`}>
              <Animated.View entering={ZoomIn.delay(k * 12).duration(200)} style={[s.dotCell, { backgroundColor: c, opacity: sel == null || on ? 1 : 0.3 }, on && s.dotOn]} />
            </Pressable>
          );
        })}
        {list.length > shown.length && <Text style={s.tiny}>+{list.length - shown.length}</Text>}
      </View>
      <View style={s.readBox}>
        {t ? (
          <Animated.View key={t.id} entering={FadeIn.duration(160)} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.mid} numberOfLines={1}>{t.note || findCategory('expense', t.category)?.label || 'Spend'}</Text>
              <Text style={s.tiny}>{new Date(t.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, {findCategory('expense', t.category)?.label ?? ''}</Text>
            </View>
            <Text style={s.mid}>{formatINR(Math.round(t.amount))}</Text>
          </Animated.View>
        ) : (
          <View style={s.row}>
            <Text style={s.big}>{formatINR(total)}</Text>
            <Text style={[s.tiny, { flex: 1, textAlign: 'right' }]}>{list.length} spends under ₹{under}{'\n'}{share}% of all you spent</Text>
          </View>
        )}
      </View>
      <Text style={s.text}>A month like this adds up to about {formatINR(Math.round((total * 12) / 100) * 100)} a year. Skipping half of them keeps {formatINR(Math.round((total * 6) / 100) * 100)}.</Text>
    </View>
  );
}

// Monday to Sunday: the average spend on each day of the week. Tap a day for what it mostly goes on.
export function Weekdays({ w }: { w: ReturnType<typeof weekdayPattern> }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(...w.avg, 1);
  const i = sel ?? w.top;
  const m = w.mainly[i];
  const times = w.overall ? w.avg[i] / w.overall : 0;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.weekRow}>
        {w.avg.map((v, k) => {
          const on = k === i;
          return (
            <Pressable key={k} style={s.weekCol} onPress={() => setSel(k)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${WEEKDAYS[k]}: about ${formatINR(Math.round(v))}`}>
              <Text style={[s.tiny, on && s.tinyOn]}>{v > 0 ? compactINR(Math.round(v)) : ''}</Text>
              <Grow h={Math.max(4, (v / max) * 84)} color={on ? Chip.orange : k === w.low ? Chip.teal : Corpus.cardAlt} i={k} />
              <Text style={[s.tiny, on && s.tinyOn]}>{WEEKDAYS[k].slice(0, 3)}</Text>
            </Pressable>
          );
        })}
      </View>
      {w.avg[i] > 0 ? (
        <Animated.View key={i} entering={FadeIn.duration(160)} style={{ gap: 2 }}>
          <Text style={s.text}>
            {WEEKDAYS[i]}s: about {formatINR(Math.round(w.avg[i]))}
            {times >= 1.15 ? `, ${times.toFixed(1)}x your usual day.` : times <= 0.85 ? `, lighter than your usual day.` : ', close to your usual day.'}
          </Text>
          {m && <Text style={s.tiny}>Mostly {m.label.toLowerCase()} ({Math.round(m.share * 100)}%)</Text>}
        </Animated.View>
      ) : (
        <Text style={s.text}>Nothing spent on {WEEKDAYS[i]}s in the last 3 months.</Text>
      )}
    </View>
  );
}

// Savings rate month by month: green at 20% or more, red when you spent more than came in.
// The dashed line is the 20% mark. Tap a month to switch Insights to it.
export function Rates({ months, onPick }: { months: { key: string; label: string; rate: number | null; on: boolean; income: number; spent: number }[]; onPick?: (key: string) => void }) {
  const max = Math.max(30, ...months.map((m) => Math.abs(m.rate ?? 0)));
  const cur = months.find((m) => m.on);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.weekRow}>
        <View pointerEvents="none" style={[s.target, { bottom: 20 + (20 / max) * 84 }]}><Text style={s.targetText}>20%</Text></View>
        {months.map((m, i) => {
          const r = m.rate;
          const color = r == null ? Corpus.cardAlt : r < 0 ? Corpus.danger : r >= 20 ? Corpus.income : Chip.yellow;
          return (
            <Pressable key={m.key} style={s.weekCol} onPress={() => onPick?.(m.key)} accessibilityRole="button" accessibilityState={{ selected: m.on }} accessibilityLabel={`${m.label}: ${r == null ? 'no income' : `${r}% kept`}`}>
              <Text style={[s.tiny, m.on && s.tinyOn]}>{r == null ? '' : `${r < 0 ? '−' : ''}${Math.abs(r)}%`}</Text>
              <Grow h={Math.max(4, (Math.abs(r ?? 0) / max) * 84)} color={color} i={i} opacity={m.on ? 1 : 0.45} />
              <Text style={[s.tiny, m.on && s.tinyOn]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {cur && (
        <Text style={s.text}>
          {cur.label}: {formatINR(Math.round(cur.income))} in, {formatINR(Math.round(cur.spent))} out.{' '}
          {cur.income > 0 ? <Text style={{ color: cur.income >= cur.spent ? Corpus.income : Corpus.danger }}>{cur.income >= cur.spent ? `Kept ${formatINR(Math.round(cur.income - cur.spent))}.` : `${formatINR(Math.round(cur.spent - cur.income))} more went out.`}</Text> : 'Nothing came in.'}
        </Text>
      )}
    </View>
  );
}

// What moved against your usual: up first (worth a look), then down
export function Movers({ m, onOpen }: { m: ReturnType<typeof categoryMovers>; onOpen: (id: string) => void }) {
  const row = (r: (typeof m.up)[number], up: boolean) => (
    <Pressable key={r.id} onPress={() => onOpen(r.id)} style={({ pressed }) => [s.mover, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <View style={[s.moverDot, { backgroundColor: CategoryChip[r.id] ?? Chip.gray }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.moverName}>{r.label}</Text>
        <Text style={s.tiny}>{formatINR(Math.round(r.now))} against a usual {formatINR(Math.round(r.usual))}</Text>
      </View>
      <View style={[s.moverPill, { backgroundColor: up ? Corpus.dangerTint : Corpus.incomeTint }]}>
        <Ionicons name={up ? 'trending-up' : 'trending-down'} size={13} color={up ? Corpus.danger : Corpus.income} />
        <Text style={[s.moverAmt, { color: up ? Corpus.danger : Corpus.income }]}>{up ? '+' : '−'}{compactINR(Math.abs(Math.round(r.diff)))}</Text>
      </View>
    </Pressable>
  );
  if (!m.up.length && !m.down.length) return <Text style={s.text}>Every category is close to your usual.</Text>;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 4 }}>
      {m.up.map((r) => row(r, true))}
      {m.down.map((r) => row(r, false))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  label: { fontSize: Type.small, color: Corpus.textMuted },
  big: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.5, ...tabular },
  mid: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, ...tabular },
  text: { fontSize: Type.bodyLg, lineHeight: 20, color: Corpus.text },
  tiny: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 128 },
  weekCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBar: { width: '100%', maxWidth: 30, borderRadius: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 16, height: 3, borderRadius: 2 },
  dash: { backgroundColor: 'transparent', borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textFaint, marginLeft: 10 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  dotCell: { width: 16, height: 16, borderRadius: 8 },
  dotOn: { transform: [{ scale: 1.35 }], borderWidth: 2, borderColor: Corpus.text },
  readBox: { minHeight: 44, justifyContent: 'center' },
  tinyOn: { color: Corpus.text, fontFamily: Font.display },
  target: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: Corpus.textFaint },
  targetText: { position: 'absolute', right: 0, top: -14, fontSize: Type.micro, color: Corpus.textFaint },
  mover: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  moverDot: { width: 10, height: 10, borderRadius: 5 },
  moverName: { fontSize: Type.input, color: Corpus.text },
  moverPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  moverAmt: { fontSize: Type.body, fontFamily: Font.display, ...tabular },
});

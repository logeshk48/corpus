import Bullet from '@/components/charts/Bullet';
import { CategoryChip, Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { compactINR, formatINR } from '@/utils/format';
import type { categoryMovers, monthPace, weekdayPattern } from '@/utils/insightsMore';
import { WEEKDAYS } from '@/utils/insightsMore';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

// Where this month is heading: spent so far against the budget, a tick for where even spending would be
// today, and the month-end estimate in words.
export function Pace({ p }: { p: ReturnType<typeof monthPace> }) {
  const over = p.budget ? p.projected - p.budget : 0;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{p.isCurrent ? 'Month-end estimate' : 'Month total'}</Text>
          <Text style={[s.big, p.budget && over > 0 ? { color: Corpus.danger } : null]}>{formatINR(p.projected)}</Text>
        </View>
        {p.budget ? (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Budget</Text>
            <Text style={s.mid}>{formatINR(p.budget)}</Text>
          </View>
        ) : null}
      </View>
      {p.budget ? <Bullet value={p.spent} limit={p.budget} pace={p.isCurrent ? p.day / p.days : undefined} color={p.spent > p.budget ? Corpus.danger : Corpus.text} height={10} /> : null}
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

// Monday to Sunday: the average spend on each day of the week, the most expensive day picked out
export function Weekdays({ w }: { w: ReturnType<typeof weekdayPattern> }) {
  const max = Math.max(...w.avg, 1);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.weekRow} accessible accessibilityLabel={WEEKDAYS.map((d, i) => `${d} ${formatINR(Math.round(w.avg[i]))}`).join(', ')}>
        {w.avg.map((v, i) => (
          <View key={i} style={s.weekCol}>
            <Text style={[s.tiny, i === w.top && { color: Corpus.text, fontFamily: Font.display }]}>{v > 0 ? compactINR(Math.round(v)) : ''}</Text>
            <View style={[s.weekBar, { height: Math.max(4, (v / max) * 84), backgroundColor: i === w.top ? Chip.orange : Corpus.cardAlt }]} />
            <Text style={[s.tiny, i === w.top && { color: Corpus.text, fontFamily: Font.display }]}>{WEEKDAYS[i].slice(0, 3)}</Text>
          </View>
        ))}
      </View>
      {w.avg[w.top] > 0 && (
        <Text style={s.text}>{WEEKDAYS[w.top]}s cost the most, about {formatINR(Math.round(w.avg[w.top]))}. {WEEKDAYS[w.low]}s are the lightest at {formatINR(Math.round(w.avg[w.low]))}.</Text>
      )}
    </View>
  );
}

// Savings rate month by month: green at 20% or more, red when you spent more than came in
export function Rates({ months }: { months: { key: string; label: string; rate: number | null; on: boolean }[] }) {
  const max = Math.max(30, ...months.map((m) => Math.abs(m.rate ?? 0)));
  return (
    <View style={s.weekRow}>
      {months.map((m) => {
        const r = m.rate;
        const color = r == null ? Corpus.cardAlt : r < 0 ? Corpus.danger : r >= 20 ? Corpus.income : Chip.yellow;
        return (
          <View key={m.key} style={s.weekCol} accessible accessibilityLabel={`${m.label}: ${r == null ? 'no income' : `${r}% kept`}`}>
            <Text style={[s.tiny, m.on && { color: Corpus.text, fontFamily: Font.display }]}>{r == null ? '' : `${r < 0 ? '−' : ''}${Math.abs(r)}%`}</Text>
            <View style={[s.weekBar, { height: Math.max(4, (Math.abs(r ?? 0) / max) * 84), backgroundColor: color, opacity: m.on ? 1 : 0.55 }]} />
            <Text style={[s.tiny, m.on && { color: Corpus.text, fontFamily: Font.display }]}>{m.label}</Text>
          </View>
        );
      })}
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
  weekBar: { width: '100%', maxWidth: 30, borderRadius: 7 },
  mover: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  moverDot: { width: 10, height: 10, borderRadius: 5 },
  moverName: { fontSize: Type.input, color: Corpus.text },
  moverPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  moverAmt: { fontSize: Type.body, fontFamily: Font.display, ...tabular },
});

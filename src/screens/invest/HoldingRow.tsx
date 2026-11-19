import Sparkline from '@/components/charts/Sparkline';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { formatPct, formatPrice } from '@/utils/market';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export type RowData = {
  key: string;
  title: string;          // RELIANCE, Parag Parikh Flexi Cap…
  sub: string;            // "10 shares · Avg ₹2,345" or "Mutual fund · 12.4 units"
  value?: number | null;  // current value (holdings) or price (watchlist)
  valueIsPrice?: boolean;
  pnl?: number | null;    // overall gain in ₹
  pnlPct?: number | null;
  ltp?: number | null;    // last price
  dayPct?: number | null; // change today
  dayLabel?: string;      // "today", "24h", "last NAV"
  spark?: number[];
  note?: string;          // a small line under the row (SIP, jar, stale)
  warn?: boolean;
};

// One line of a holdings or watchlist table, like a broker app: name and quantity on the left, a month's
// sparkline in the middle, value and return on the right, and today's price move under it. When a live
// price ticks, the price flashes green or red for a moment.
export default function HoldingRow({ d, first, onPress, onLongPress, children }: { d: RowData; first?: boolean; onPress: () => void; onLongPress?: () => void; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const flash = useSharedValue(0);
  const prev = useRef(d.ltp);
  useEffect(() => {
    if (prev.current != null && d.ltp != null && d.ltp !== prev.current && !reduce) {
      flash.value = withSequence(withTiming(d.ltp > prev.current ? 1 : -1, { duration: 120 }), withTiming(0, { duration: 900 }));
    }
    prev.current = d.ltp;
  }, [d.ltp, reduce, flash]);
  const flashStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(flash.value, [-1, 0, 1], [Corpus.dangerTint, 'transparent', Corpus.incomeTint]) }));
  const up = (d.pnl ?? 0) >= 0;
  const dayUp = (d.dayPct ?? 0) >= 0;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [s.row, !first && s.line, pressed && { backgroundColor: Corpus.cardAlt }]}
      accessibilityRole="button"
      accessibilityLabel={`${d.title}. ${d.sub}. ${d.value != null ? formatINR(Math.round(d.value)) : ''}${d.pnl != null ? `, ${up ? 'up' : 'down'} ${formatINR(Math.abs(Math.round(d.pnl)))}` : ''}${d.dayPct != null ? `, ${formatPct(d.dayPct)} ${d.dayLabel ?? 'today'}` : ''}`}>
      <View style={s.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title} numberOfLines={1}>{d.title}</Text>
          <Text style={[s.sub, d.warn && { color: Corpus.warning }]} numberOfLines={1}>{d.sub}</Text>
        </View>
        {d.spark && d.spark.length > 1 ? <Sparkline values={d.spark} width={56} height={28} /> : <View style={{ width: 56 }} />}
        <View style={s.right}>
          <Text style={s.value}>{d.value == null ? '—' : d.valueIsPrice ? formatPrice(d.value) : formatINR(Math.round(d.value))}</Text>
          {d.pnl != null ? (
            <Text style={[s.pnl, { color: up ? Corpus.income : Corpus.danger }]}>{up ? '+' : '−'}{formatINR(Math.abs(Math.round(d.pnl)))}{d.pnlPct != null ? ` (${Math.abs(d.pnlPct).toFixed(2)}%)` : ''}</Text>
          ) : d.dayPct != null ? (
            <Text style={[s.pnl, { color: dayUp ? Corpus.income : Corpus.danger }]}>{formatPct(d.dayPct)}</Text>
          ) : null}
        </View>
      </View>
      {(d.ltp != null || d.note) && (
        <View style={s.bottom}>
          {d.ltp != null && !d.valueIsPrice ? (
            <Animated.View style={[s.ltpBox, flashStyle]}>
              <Text style={s.sub}>LTP {formatPrice(d.ltp)}</Text>
              {d.dayPct != null && <Text style={[s.sub, { color: dayUp ? Corpus.income : Corpus.danger, fontFamily: Font.display }]}>{formatPct(d.dayPct)} {d.dayLabel ?? 'today'}</Text>}
            </Animated.View>
          ) : <View />}
          {!!d.note && <Text style={s.note} numberOfLines={1}>{d.note}</Text>}
        </View>
      )}
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  right: { alignItems: 'flex-end', gap: 2, minWidth: 92 },
  value: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  pnl: { fontSize: Type.small, fontFamily: Font.display, ...tabular },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ltpBox: { flexDirection: 'row', gap: 8, borderRadius: 6, paddingHorizontal: 4, marginLeft: -4 },
  note: { fontSize: Type.small, color: Corpus.textMuted, flexShrink: 1, textAlign: 'right' },
});

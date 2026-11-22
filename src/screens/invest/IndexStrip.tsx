import Sparkline from '@/components/charts/Sparkline';
import { Tap } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { useSparks } from '@/hooks/useSparks';
import { formatPct, formatPts, getQuotes, INDICES, marketStatus, priceTime, type Quote } from '@/utils/market';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Market status, then NIFTY / SENSEX / BANK NIFTY as cards with today's line. Tap one for its chart.
export default function IndexStrip({ onOpen }: { onOpen: (symbol: string, name: string) => void }) {
  const [q, setQ] = useState<Record<string, Quote>>({});
  const [err, setErr] = useState(false);
  const status = marketStatus();
  const reduce = useReducedMotion();
  useEffect(() => {
    let alive = true;
    const load = () => getQuotes(INDICES.map((i) => i.symbol)).then((r) => alive && (setQ(r), setErr(false))).catch(() => alive && setErr(true));
    load();
    const t = setInterval(load, status.open ? 60_000 : 15 * 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [status.open]);
  const sparks = useSparks(INDICES.map((i) => ({ kind: 'stock' as const, id: i.symbol })), '1d');
  const pulse = useSharedValue(1);
  useEffect(() => { if (status.open && !reduce) pulse.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true); }, [status.open, reduce, pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const time = Object.values(q)[0]?.time;
  return (
    <View style={{ gap: 10 }}>
      <View style={s.status}>
        <Animated.View style={[s.dot, { backgroundColor: status.open ? Corpus.income : Corpus.textFaint }, status.open && dot]} />
        <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>{status.open ? 'Market open' : status.label.split('. ')[0]}</Text>
        <Text style={s.small}>{err ? 'Prices paused, retrying' : time ? priceTime(time) : ''}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {INDICES.map((i) => {
          const x = q[i.symbol];
          const up = (x?.change ?? 0) >= 0;
          const c = x?.change == null ? Corpus.textMuted : up ? Corpus.income : Corpus.danger;
          return (
            <Tap key={i.symbol} onPress={() => onOpen(i.symbol, i.name)} style={s.card} accessibilityRole="button"
              accessibilityLabel={`${i.name} ${formatPts(x?.price)}, ${formatPct(x?.changePct)} today`}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.name}>{i.name}</Text>
                <Text style={s.value}>{formatPts(x?.price)}</Text>
                <Text style={[s.change, { color: c }]}>{x?.change == null ? ' ' : `${up ? '+' : '−'}${Math.abs(x.change).toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${formatPct(x.changePct)})`}</Text>
              </View>
              <Sparkline values={sparks[`stock:${i.symbol}`] ?? []} base={x?.prevClose ?? null} width={58} height={34} />
            </Tap>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  small: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 220, backgroundColor: Corpus.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  name: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted },
  value: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  change: { fontSize: Type.small, fontFamily: Font.display, ...tabular },
});

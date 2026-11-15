import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Candle } from '@/utils/candles';
import { compactINR, formatINR } from '@/utils/format';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Trading-app style candles (hollow = ended higher, filled = ended lower) drawn with plain Views (no SVG needed, works on web + phone).
// Tap or hover a candle to read it; the parent shows the reading in its big number.
const H = 132;

export default function CandleChart({ candles, selected, onSelect, appear = 1, label }: {
  candles: Candle[]; selected: number; onSelect: (i: number) => void; appear?: number; label: (c: Candle) => string;
}) {
  const hi = Math.max(...candles.map((c) => c.high));
  const lo = Math.min(...candles.map((c) => c.low));
  const pad = Math.max((hi - lo) * 0.12, Math.abs(hi) * 0.01, 1);
  const max = hi + pad, min = lo - pad;
  const y = (v: number) => ((max - v) / (max - min)) * H;
  const n = candles.length;

  return (
    <View>
      <View style={s.plot}>
        <View style={s.grid} pointerEvents="none">
          {[max - pad, (max + min) / 2, min + pad].map((v, i) => (
            <View key={i} style={[s.gridLine, { top: y(v) }]}>
              <View style={s.rule} />
              <Text style={s.axis}>{compactINR(v)}</Text>
            </View>
          ))}
        </View>
        <View style={s.cols}>
          {candles.map((c, i) => {
            const up = c.close > c.open, down = c.close < c.open;
            const color = up ? Corpus.income : down ? Corpus.danger : Corpus.textFaint;
            const top = y(Math.max(c.open, c.close));
            const body = Math.max(3, Math.abs(y(c.open) - y(c.close)));
            const on = i === selected;
            const show = Math.max(0, Math.min(1, appear * n * 1.2 - i * 0.6)); // left-to-right reveal
            return (
              <Pressable
                key={c.start.toISOString()}
                style={[s.col, on && i !== n - 1 && s.colOn]}
                onPress={() => onSelect(i)}
                onHoverIn={() => onSelect(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${label(c)}: ${up ? 'up' : down ? 'down' : 'no change'}, opened ${formatINR(c.open)}, closed ${formatINR(c.close)}, high ${formatINR(c.high)}, low ${formatINR(c.low)}`}
              >
                <View style={{ opacity: show * (on || selected === n - 1 ? 1 : 0.55), height: H, width: '100%', alignItems: 'center' }}>
                  <View style={[s.wick, { top: y(c.high), height: Math.max(1, y(c.low) - y(c.high)), backgroundColor: color }]} />
                  {/* skill: up = hollow, down = filled, so direction never depends on colour alone */}
                  <View style={[s.body, { top, height: body }, up ? { borderWidth: 1.5, borderColor: color, backgroundColor: Corpus.card } : { backgroundColor: color }]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={s.xRow}>
        <Text style={s.x}>{label(candles[0])}</Text>
        <Text style={s.x}>{label(candles[n - 1])}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  plot: { height: H, flexDirection: 'row' },
  grid: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border },
  axis: { width: 44, fontSize: Type.micro, color: Corpus.textMuted, ...tabular },
  cols: { flex: 1, flexDirection: 'row', marginRight: 50, gap: 2 },
  col: { flex: 1, borderRadius: 6 },
  colOn: { backgroundColor: Corpus.cardAlt },
  wick: { position: 'absolute', width: 1.5, borderRadius: 1 },
  body: { position: 'absolute', width: '58%', maxWidth: 14, borderRadius: 3 },
  xRow: { flexDirection: 'row', justifyContent: 'space-between', marginRight: 50, marginTop: 6 },
  x: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted },
});

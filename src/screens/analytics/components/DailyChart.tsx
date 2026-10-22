import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import type { DayPoint } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const HEIGHT = 120;

type Props = { points: DayPoint[]; average: number; monthKey: string };

// One-hue columns per day; tap a column to read it. Dashed line = daily average.
export default function DailyChart({ points, average, monthKey }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.amount), average, 1);
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5)) - 1;
  const sel = selected !== null ? points[selected - 1] : null;

  const readout = sel
    ? `${new Date(y, m, sel.day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${
        sel.future ? 'not yet' : sel.amount > 0 ? formatINR(sel.amount) : 'no spending'
      }`
    : `Daily average ${formatINR(Math.round(average))} · tap a day`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.readout, sel && { color: Corpus.text }]}>{readout}</Text>
      <View style={styles.plot}>
        {/* average line */}
        {average > 0 && (
          <View style={[styles.avg, { bottom: (average / max) * HEIGHT }]} />
        )}
        {points.map((p) => {
          const h = p.amount > 0 ? Math.max((p.amount / max) * HEIGHT, 3) : 0;
          const active = selected === p.day;
          return (
            <Pressable
              key={p.day}
              style={styles.slot}
              onPress={() => setSelected(active ? null : p.day)}
              accessibilityLabel={`Day ${p.day}: ${p.future ? 'future' : formatINR(p.amount)}`}
            >
              {p.future ? (
                <View style={[styles.bar, { height: 3, backgroundColor: ChartColors.future }]} />
              ) : (
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: ChartColors.spend, opacity: selected === null || active ? 1 : 0.35 },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        {[1, 8, 15, 22, points.length].map((d) => (
          <Text key={d} style={[styles.tick, { left: `${((d - 0.5) / points.length) * 100}%` }]}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  readout: { fontSize: Type.small, color: Corpus.textMuted },
  plot: {
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: ChartColors.grid,
  },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1 },
  bar: { width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  avg: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Corpus.textMuted,
  },
  axis: { height: 14 },
  tick: { position: 'absolute', fontSize: Type.micro, color: Corpus.textFaint, transform: [{ translateX: -4 }] },
});

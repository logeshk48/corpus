import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import { heatLevel, type DayPoint } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Month grid, Monday first. Brighter amber = more spent that day. Tap a day to read it.
export default function CalendarHeatmap({ points, monthKey }: { points: DayPoint[]; monthKey: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const y = Number(monthKey.slice(0, 4));
  const m = Number(monthKey.slice(5)) - 1;
  const max = Math.max(...points.map((p) => p.amount), 1);
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells: (DayPoint | null)[] = [...Array.from({ length: lead }, () => null), ...points];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const sel = selected ? points[selected - 1] : null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.readout, sel && { color: Corpus.text }]}>
        {sel
          ? `${new Date(y, m, sel.day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${
              sel.future ? 'not yet' : sel.amount > 0 ? formatINR(sel.amount) : 'no spending'
            }`
          : 'Brighter = more spent · tap a day'}
      </Text>
      <View style={styles.row}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={styles.weekday}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={styles.row}>
          {week.map((p, i) => {
            if (!p) return <View key={i} style={styles.cellWrap} />;
            const level = p.future ? 0 : heatLevel(p.amount, max);
            const active = selected === p.day;
            return (
              <Pressable key={i} style={styles.cellWrap} onPress={() => setSelected(active ? null : p.day)}>
                <View
                  style={[
                    styles.cell,
                    { backgroundColor: p.future ? ChartColors.future : ChartColors.heat[level] },
                    active && styles.active,
                  ]}
                >
                  <Text style={[styles.dayNum, level >= 3 && { color: Corpus.onGold, fontWeight: '600' }]}>{p.day}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.scale}>
        <Text style={styles.scaleText}>Less</Text>
        {ChartColors.heat.map((c) => (
          <View key={c} style={[styles.scaleCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.scaleText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  readout: { fontSize: Type.small, color: Corpus.textMuted, marginBottom: 4 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: Type.micro, color: Corpus.textFaint },
  cellWrap: { flex: 1, padding: 2 },
  cell: { aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  active: { borderWidth: 2, borderColor: Corpus.text },
  dayNum: { fontSize: Type.caption, color: Corpus.text },
  scale: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  scaleText: { fontSize: Type.micro, color: Corpus.textMuted },
  scaleCell: { width: 12, height: 12, borderRadius: 3 },
});

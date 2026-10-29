import { Corpus } from '@/constants/theme';
import type { Point } from '@/utils/market';
import { Text, View } from 'react-native';
import { m } from './Market.styles';

// Simple area-style chart from columns (no chart library needed). Green if up over the range.
export default function PriceChart({ points, base }: { points: Point[]; base?: number | null }) {
  if (points.length < 2) return <View style={[m.chart, { alignItems: 'center', justifyContent: 'center' }]}><Text style={m.tiny}>No chart data</Text></View>;
  const N = 72;
  const step = points.length / N;
  const cols = points.length <= N ? points : Array.from({ length: N }, (_, i) => points[Math.min(points.length - 1, Math.floor(i * step))]).concat(points[points.length - 1]);
  const vals = cols.map((p) => p.c);
  const ref = base ?? points[0].c;
  const lo = Math.min(...vals, ref), hi = Math.max(...vals, ref);
  const span = hi - lo || 1;
  const up = points[points.length - 1].c >= ref;
  const color = up ? Corpus.income : Corpus.danger;
  return (
    <View>
      <View style={m.chart}>
        {cols.map((p, i) => (
          <View key={i} style={{ flex: 1, height: `${8 + ((p.c - lo) / span) * 92}%`, backgroundColor: color, opacity: i === cols.length - 1 ? 1 : 0.35, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
        ))}
      </View>
      <View style={[m.statusRow, { marginTop: 4 }]}>
        <Text style={m.tiny}>{fmtT(points[0].t, points)}</Text>
        <Text style={m.tiny}>Low {lo.toLocaleString('en-IN', { maximumFractionDigits: 2 })} · High {hi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
        <Text style={m.tiny}>{fmtT(points[points.length - 1].t, points)}</Text>
      </View>
    </View>
  );
}
const fmtT = (t: string, pts: Point[]) => {
  const d = new Date(t);
  const sameDay = new Date(pts[0].t).toDateString() === new Date(pts[pts.length - 1].t).toDateString();
  return sameDay ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
};

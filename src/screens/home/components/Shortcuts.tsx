import Spark from '@/components/charts/Spark';
import { IconChip, Tap } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type Shortcut = {
  key: string;
  label: string;
  icon: string;
  figure?: string;      // the number, when there is one: "₹5.2K", "72%"
  status: string;       // what the number means, or what to do: "you have", "Update balances"
  tone?: 'normal' | 'warn' | 'danger' | 'good';
  spark?: number[];     // last 14 days
  progress?: number;    // 0 to 1, drawn as a thin bar (budget used, jar goals reached)
  wide?: boolean;       // full width: the money you have leads
  onPress: () => void;
};

const COLOR: Record<string, string> = { accounts: Chip.blue, budgets: Chip.orange, people: Chip.pink, jars: Chip.yellow, income: Chip.green };
const TONE = { warn: Corpus.warning, danger: Corpus.danger, good: Corpus.income, normal: Corpus.textMuted };
const solid = (icon: string) => icon.replace(/-outline$/, '');

function Tile({ s, width }: { s: Shortcut; width: number }) {
  const color = COLOR[s.key] ?? Chip.gray;
  const alert = s.tone === 'warn' || s.tone === 'danger';
  const tone = TONE[s.tone ?? 'normal'];
  const barColor = s.tone === 'danger' ? Corpus.danger : s.tone === 'warn' ? Corpus.warning : color;
  return (
    <Tap onPress={s.onPress} scaleTo={0.98} style={[st.tile, { width }, s.wide && st.wide]} accessibilityRole="button" accessibilityLabel={`${s.label}: ${s.figure ?? ''} ${s.status}`}>
      <View style={st.head}>
        <IconChip icon={solid(s.icon)} color={color} size={28} />
        <Text style={st.label} numberOfLines={1}>{s.label}</Text>
        <Ionicons name="chevron-forward" size={15} color={Corpus.textFaint} />
      </View>
      <View style={s.wide ? st.wideBody : st.body}>
        <View style={{ flex: 1, gap: 2 }}>
          {s.figure ? <Text style={[st.figure, s.wide && st.figureWide]} numberOfLines={1}>{s.figure}</Text> : null}
          <View style={st.statusRow}>
            {alert && <Ionicons name="alert-circle" size={13} color={tone} />}
            <Text style={[st.status, !s.figure && st.statusOnly, (alert || s.tone === 'good') && { color: tone }]} numberOfLines={s.figure ? 1 : 2}>{s.status}</Text>
          </View>
        </View>
        {s.wide && s.spark && s.spark.length > 2 ? <Spark values={s.spark} color={color} width={112} height={40} /> : null}
      </View>
      {s.progress != null && (
        <View style={st.track}>
          <View style={[st.fill, { width: `${Math.min(1, Math.max(0, s.progress)) * 100}%`, backgroundColor: barColor }]} />
        </View>
      )}
    </Tap>
  );
}

// Your money: where your money lives, one tap from Today. The money you have leads across the full width,
// the four other places sit in a 2 by 2 grid under it, each with its figure and what it means.
export default function Shortcuts({ items }: { items: Shortcut[] }) {
  const [w, setW] = useState(0);
  const half = w ? Math.floor((w - 10) / 2) - 0.5 : 0; // round down: a fraction of a pixel too wide wraps the second tile
  return (
    <View style={st.wrap}>
      <Text style={st.title} accessibilityRole="header">Your money</Text>
      <View style={st.grid} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {half > 0 && items.map((s) => <Tile key={s.key} s={s} width={s.wide ? Math.floor(w) : half} />)}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { backgroundColor: Corpus.card, borderRadius: 22, padding: 14, gap: 10, minHeight: 118, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  wide: { minHeight: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  body: { flex: 1, justifyContent: 'flex-end' },
  wideBody: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  figure: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.4, ...tabular },
  figureWide: { fontSize: Type.h1, letterSpacing: -0.6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { flexShrink: 1, fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  statusOnly: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  track: { height: 5, borderRadius: 3, backgroundColor: Corpus.cardAlt, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
});

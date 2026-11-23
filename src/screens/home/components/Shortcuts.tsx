import Spark from '@/components/charts/Spark';
import { IconChip, Tap } from '@/components/ui';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export type Shortcut = {
  key: string;
  label: string;
  icon: string;
  value: string;        // short status: "₹5.2K", "Update", "All square"
  tone?: 'normal' | 'warn' | 'danger' | 'good';
  spark?: number[];     // last 14 days, drawn before the value
  onPress: () => void;
};

const COLOR: Record<string, string> = { accounts: Chip.blue, budgets: Chip.orange, people: Chip.pink, jars: Chip.yellow, income: Chip.green, networth: Chip.indigo };
const ALERT = { warn: Corpus.warning, danger: Corpus.danger };
const solid = (icon: string) => icon.replace(/-outline$/, '');

// Your money: a two-column grid of tiles. Each tile: the area, its figure in bold, a short status line,
// and the last 14 days as a small line where there is one. An alert replaces the status in amber or red.
export default function Shortcuts({ items }: { items: Shortcut[] }) {
  const [w, setW] = useState(0);
  const tile = w ? (w - 10) / 2 : 0;
  return (
    <View style={st.wrap}>
      <Text style={st.title} accessibilityRole="header">Your money</Text>
      <View style={st.grid} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {tile > 0 && items.map((s, i) => {
          const m = s.value.match(/^([−+-]?₹[\d.,]+(?:\s?(?:K|L|Cr)\b)?|\d+%)\s*(.*)$/); // the figure, then its status
          const alert = s.tone === 'warn' || s.tone === 'danger' ? ALERT[s.tone] : null;
          const color = COLOR[s.key] ?? Chip.gray;
          const status = m ? m[2] : s.value;
          return (
            <Animated.View key={s.key} entering={FadeInDown.delay(i * 50).duration(300)} style={{ width: tile }}>
              <Tap onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.label}, ${s.value}`} style={st.tile}>
                <View style={st.top}>
                  <IconChip icon={solid(s.icon)} color={color} size={30} />
                  {s.spark && s.spark.length > 1 ? <Spark values={s.spark} color={color} width={54} height={22} /> : null}
                </View>
                <Text style={st.label}>{s.label}</Text>
                {m ? <Text style={st.amount} numberOfLines={1}>{m[1]}</Text> : null}
                {alert ? (
                  <View style={st.alert}>
                    <Ionicons name="alert-circle" size={13} color={alert} />
                    <Text style={[st.sub, { color: alert }]} numberOfLines={1}>{status || 'Check'}</Text>
                  </View>
                ) : status ? <Text style={st.sub} numberOfLines={1}>{status}</Text> : null}
              </Tap>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { backgroundColor: Corpus.card, borderRadius: 22, padding: 14, gap: 3, minHeight: 124, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: Type.body, color: Corpus.textMuted },
  amount: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.3, ...tabular },
  sub: { fontSize: Type.small, color: Corpus.textMuted },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

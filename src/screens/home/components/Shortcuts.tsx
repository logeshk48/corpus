import Spark from '@/components/charts/Spark';
import { IconChip } from '@/components/ui';
import { Chip, Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

// Your money: one row per area, read like a ledger. The figure sits on the right where the eye scans.
export default function Shortcuts({ items }: { items: Shortcut[] }) {
  return (
    <View style={st.wrap}>
      <Text style={st.title} accessibilityRole="header">Your money</Text>
      <View style={st.card}>
        {items.map((s, i) => {
          const m = s.value.match(/^([−+-]?₹[\d.,]+[KLCr]*)\s*(.*)$/);
          const alert = s.tone === 'warn' || s.tone === 'danger' ? ALERT[s.tone] : null;
          return (
            <View key={s.key}>
              <Pressable onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.label}, ${s.value}`} style={({ pressed }) => [st.row, pressed && { backgroundColor: Corpus.cardAlt }]}>
                <IconChip icon={solid(s.icon)} color={COLOR[s.key] ?? Chip.gray} />
                <View style={st.body}>
                  <Text style={st.label}>{s.label}</Text>
                  {alert ? (
                    <View style={st.alert}>
                      <Ionicons name="alert-circle" size={13} color={alert} />
                      <Text style={[st.sub, { color: alert }]} numberOfLines={1}>{m ? m[2] || 'Check' : s.value}</Text>
                    </View>
                  ) : (
                    !!(m ? m[2] : s.value) && <Text style={st.sub} numberOfLines={1}>{m ? m[2] : s.value}</Text>
                  )}
                </View>
                {s.spark && <Spark values={s.spark} color={COLOR[s.key] ?? Chip.gray} width={52} height={24} />}
                {m && <Text style={st.amount} numberOfLines={1}>{m[1]}</Text>}
                <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
              </Pressable>
              {i < items.length - 1 && <View style={st.sep} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 6 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  card: { backgroundColor: Corpus.card, borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 9, paddingHorizontal: Space.md },
  body: { flex: 1, gap: 1 },
  label: { fontSize: Type.input, color: Corpus.text },
  sub: { fontSize: Type.body, color: Corpus.textMuted },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginLeft: 58 },
});

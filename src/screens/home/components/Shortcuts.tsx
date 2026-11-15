import { Corpus, Font, Pastel, tabular, Type, type PastelName } from '@/constants/theme';
import Spark from '@/components/charts/Spark';
import { IconChip } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useEntrance } from '@/hooks/useEntrance';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type Shortcut = {
  key: string;
  label: string;
  icon: string;
  value: string;        // short status: "₹5.2K", "Update", "All square"
  tone?: 'normal' | 'warn' | 'danger' | 'good';
  spark?: number[];     // wide tiles: last 14 days, drawn on the right
  onPress: () => void;
};

// Bento sizes (ui-ux-pro-max "Bento Box Grid": varied 1x1 / 2x1, asymmetric): the money you have and your
// net worth get the wide tiles, the rest are squares.
const WIDE = new Set(['accounts', 'networth']);
const TONE: Record<string, PastelName> = { accounts: 'sky', budgets: 'peach', people: 'rose', jars: 'butter', income: 'mint', networth: 'lilac' };
const ALERT = { warn: Corpus.warning, danger: Corpus.danger };
const solid = (icon: string) => icon.replace(/-outline$/, '');

// Money: a bento grid — one pastel tile per area, its status in big type. Amounts get the big size; words stay smaller.
export default function Shortcuts({ items }: { items: Shortcut[] }) {
  const t = useEntrance(700); // tiles appear one after another, 45 ms apart (skill: stagger 30–50 ms)
  return (
    <View style={st.wrap}>
      <Text style={st.title} accessibilityRole="header">Your money</Text>
      <View style={st.grid}>
        {items.map((s, i) => {
          const k = Math.min(1, Math.max(0, (t * 700 - i * 45) / 300));
          const p = Pastel[TONE[s.key] ?? 'sky'];
          // "₹50K this month" → big "₹50K" with "this month" under it
          const m = s.value.match(/^([−+-]?₹[\d.,]+[KLCr]*)\s*(.*)$/);
          const alert = s.tone === 'warn' || s.tone === 'danger' ? ALERT[s.tone] : null;
          return (
            <Pressable key={s.key} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.label}, ${s.value}`}
              style={({ pressed }) => [st.tile, WIDE.has(s.key) ? st.wide : st.square, { backgroundColor: p.bg, opacity: k, transform: [{ translateY: (1 - k) * 10 }, { scale: pressed ? 0.96 : 1 }] }]}>
              <View style={st.top}>
                <IconChip icon={solid(s.icon)} color={p.icon} size={34} />
                {alert && (
                  // never colour alone: icon + word
                  <View style={[st.alert, { borderColor: alert }]}>
                    <Ionicons name="alert-circle" size={14} color={alert} />
                    <Text style={[st.alertText, { color: p.fg }]}>Check</Text>
                  </View>
                )}
              </View>
              <Text style={[st.label, { color: p.fg }]}>{s.label}</Text>
              {m ? (
                <>
                  <Text style={[st.amount, { color: p.fg }]} numberOfLines={1}>{m[1]}</Text>
                  {!!m[2] && <Text style={[st.small, { color: p.fg }]} numberOfLines={1}>{m[2]}</Text>}
                </>
              ) : (
                <Text style={[st.value, { color: p.fg }]} numberOfLines={2}>{s.value}</Text>
              )}
              {s.spark && WIDE.has(s.key) && (
                <View style={st.spark}><Spark values={s.spark} color={p.icon} width={110} height={34} /></View>
              )}
            </Pressable>
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
  tile: { minHeight: 116, borderRadius: 26, padding: 14, gap: 2 },
  square: { width: '48.5%', flexGrow: 1 },
  wide: { width: '100%', minHeight: 104 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: Corpus.card },
  alertText: { fontSize: Type.small, fontWeight: '700' },
  label: { fontSize: Type.body, fontWeight: '700' },
  value: { fontSize: Type.bodyLg, fontWeight: '500' },
  amount: { fontSize: Type.h3, fontFamily: Font.displayBold, ...tabular },
  spark: { position: 'absolute', right: 16, bottom: 18 },
  small: { fontSize: Type.small, fontWeight: '500' },
});

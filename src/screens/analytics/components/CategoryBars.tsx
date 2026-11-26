import { ChartColors } from '@/constants/chartColors';
import { CategoryChip, Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Transaction } from '@/types/transaction';
import { categoryTotals, monthLabel, ym, type CategoryShare } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

type Props = {
  data: CategoryShare[];
  tx: Transaction[];
  monthKey: string;
  previous?: Map<string, number>;         // same categories, comparable period last month
  budgets?: Record<string, number>;       // category id to monthly limit
  previousLabel?: string;
  onOpen?: (id: string) => void;
};

const MINI = 44;

// One row per category, biggest first (over-budget ones lead). Tap a row to open it in place:
// the last 6 months for that category and what the money went on this month.
export default function CategoryBars({ data, tx, monthKey, previous, budgets, previousLabel = 'last month', onOpen }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const rise = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    setOpen(null);
    if (reduce) { rise.value = 1; return; }
    rise.value = 0;
    rise.value = withDelay(80, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [monthKey, reduce, rise]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: rise.value }] }));

  const max = Math.max(...data.map((d) => Math.max(d.amount, budgets?.[d.id] ?? 0)), 1);
  const over = (d: CategoryShare) => { const l = budgets?.[d.id]; return l && d.amount > l ? d.amount - l : 0; };
  const rows = [...data].sort((a, b) => over(b) - over(a) || b.amount - a.amount);

  // last 6 months, ending at the month on screen
  const months = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    return Array.from({ length: 6 }, (_, k) => ym(new Date(y, m - 1 - (5 - k), 1)));
  }, [monthKey]);
  const history = useMemo(() => months.map((k) => categoryTotals(tx, k)), [months, tx]);

  const detail = (id: string) => {
    const notes = new Map<string, { label: string; amount: number; count: number }>();
    for (const t of tx) {
      if (t.type !== 'expense' || t.category !== id || ym(new Date(t.date)) !== monthKey) continue;
      const label = (t.note ?? '').trim() || 'No note';
      const k = label.toLowerCase();
      const g = notes.get(k) ?? { label, amount: 0, count: 0 };
      g.amount += t.amount; g.count += 1;
      notes.set(k, g);
    }
    return [...notes.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
  };

  return (
    <View style={s.list}>
      {rows.map((d) => {
        const before = previous?.get(d.id) ?? 0;
        const pct = before > 0 ? Math.round(((d.amount - before) / before) * 100) : null;
        const limit = budgets?.[d.id];
        const isOver = limit !== undefined && d.amount > limit;
        const isOpen = open === d.id;
        const tone = CategoryChip[d.id] ?? Chip.gray;
        const series = history.map((h) => h.get(d.id) ?? 0);
        const sMax = Math.max(...series, 1);
        const avg = series.slice(0, 5).reduce((a, v) => a + v, 0) / 5;
        const meta = [
          !previous ? '' : pct === null ? (before === 0 && d.amount > 0 ? `New vs ${previousLabel}` : '') : pct === 0 ? `Same as ${previousLabel}`
            : `${Math.abs(pct) > 200 ? formatINR(Math.round(Math.abs(d.amount - before))) : `${Math.abs(pct)}%`} ${pct > 0 ? 'more' : 'less'} than ${previousLabel}`,
          limit !== undefined ? (isOver ? `Over budget by ${formatINR(d.amount - limit)}` : `Budget ${formatINR(limit)}`) : '',
        ].filter(Boolean).join('. ');
        return (
          <Animated.View key={d.id} layout={reduce ? undefined : LinearTransition.duration(240)} style={[s.row, isOpen && s.rowOpen]}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : d.id)}
              style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${d.label}: ${formatINR(d.amount)}, ${d.share} percent`}
            >
              <View style={s.top}>
                <Ionicons name={d.icon as keyof typeof Ionicons.glyphMap} size={14} color={isOpen ? tone : Corpus.textMuted} />
                <Text style={s.label}>{d.label}</Text>
                <View style={s.leader} />
                <Text style={s.amount}>{formatINR(d.amount)}</Text>
                <Text style={s.share}>{d.share}%</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={Corpus.textFaint} />
              </View>
              <View style={s.track}>
                <Animated.View style={[s.fill, { width: `${(d.amount / max) * 100}%`, backgroundColor: isOpen ? tone : ChartColors.spend, transformOrigin: 'left' }, grow]} />
                {limit !== undefined && <View style={[s.marker, { left: `${Math.min((limit / max) * 100, 100)}%` }]} />}
              </View>
              {!!meta && <Text style={[s.meta, isOver && { color: Corpus.danger }]}>{meta}</Text>}
            </Pressable>

            {isOpen && (
              <Animated.View entering={reduce ? undefined : FadeIn.duration(220)} style={s.detail}>
                <View style={s.miniRow}>
                  {series.map((v, k) => {
                    const cur = k === 5;
                    return (
                      <View key={months[k]} style={s.miniCol}>
                        <Text style={[s.miniVal, cur && { color: Corpus.text }]} numberOfLines={1}>{v ? formatINR(Math.round(v)).replace('₹', '') : ''}</Text>
                        <View style={s.miniSlot}>
                          <View style={[s.miniBar, { height: v ? Math.max(3, (v / sMax) * MINI) : 2, backgroundColor: cur ? tone : Corpus.cardAlt }]} />
                        </View>
                        <Text style={[s.miniLabel, cur && { color: Corpus.text }]}>{monthLabel(months[k], 'short').split(' ')[0]}</Text>
                      </View>
                    );
                  })}
                </View>
                {avg > 0 && (
                  <Text style={s.meta}>
                    {`Usually ${formatINR(Math.round(avg))} a month. `}
                    <Text style={{ color: d.amount > avg ? Corpus.danger : Corpus.income }}>{d.amount > avg ? `${formatINR(Math.round(d.amount - avg))} above usual` : `${formatINR(Math.round(avg - d.amount))} below usual`}</Text>
                  </Text>
                )}
                <View style={{ gap: 6 }}>
                  {detail(d.id).map((n) => (
                    <View key={n.label} style={s.noteRow}>
                      <Text style={s.noteLabel} numberOfLines={1}>{n.label}</Text>
                      <Text style={s.noteCount}>{n.count}x</Text>
                      <Text style={s.noteAmt}>{formatINR(Math.round(n.amount))}</Text>
                    </View>
                  ))}
                </View>
                {onOpen && (
                  <Pressable onPress={() => onOpen(d.id)} hitSlop={8} accessibilityRole="link" style={s.openBtn}>
                    <Text style={[s.openText, { color: tone }]}>All {d.label.toLowerCase()} entries</Text>
                    <Ionicons name="chevron-forward" size={14} color={tone} />
                  </Pressable>
                )}
              </Animated.View>
            )}
          </Animated.View>
        );
      })}
      {budgets && Object.keys(budgets).length > 0 && (
        <View style={s.legend}>
          <View style={s.legendTick} />
          <Text style={s.meta}>Budget limit</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 6 },
  row: { gap: 6, paddingVertical: 6, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 14 },
  rowOpen: { backgroundColor: Corpus.cardAlt + '66' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  leader: { flex: 1, alignSelf: 'flex-end', marginBottom: 4, marginHorizontal: 2, borderBottomWidth: 2, borderStyle: 'dotted', borderColor: Corpus.textFaint },
  amount: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  share: { width: 34, textAlign: 'right', fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  track: { height: 8, borderRadius: 4, backgroundColor: Corpus.cardAlt },
  fill: { height: 8, borderRadius: 4 },
  marker: { position: 'absolute', top: -3, width: 2, height: 14, marginLeft: -1, borderRadius: 1, backgroundColor: ChartColors.budgetMarker },
  meta: { fontSize: Type.caption, color: Corpus.textMuted },
  detail: { gap: 12, paddingTop: 8 },
  miniRow: { flexDirection: 'row', gap: 6 },
  miniCol: { flex: 1, alignItems: 'center', gap: 4 },
  miniVal: { fontSize: Type.micro, color: Corpus.textMuted, ...tabular },
  miniSlot: { height: MINI, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  miniBar: { width: '70%', borderRadius: 4 },
  miniLabel: { fontSize: Type.micro, color: Corpus.textFaint },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteLabel: { flex: 1, fontSize: Type.small, color: Corpus.text },
  noteCount: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  noteAmt: { fontSize: Type.small, fontFamily: Font.display, color: Corpus.text, minWidth: 64, textAlign: 'right', ...tabular },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  openText: { fontSize: Type.small, fontFamily: Font.display },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  legendTick: { width: 2, height: 12, borderRadius: 1, backgroundColor: ChartColors.budgetMarker },
});

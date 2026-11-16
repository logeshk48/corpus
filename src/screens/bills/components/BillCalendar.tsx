import { Spring } from '@/constants/motion';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { monthEntries, nextDue } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

type State = 'paid' | 'due' | 'overdue' | 'skipped';
// Each state has its own symbol as well as its colour, so it never depends on colour alone
export const MARK: Record<State, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; tint: string }> = {
  paid: { label: 'Paid', icon: 'checkmark-circle', color: Corpus.income, tint: Corpus.incomeTint },
  due: { label: 'To pay', icon: 'ellipse-outline', color: Corpus.text, tint: Corpus.cardAlt },
  overdue: { label: 'Late', icon: 'alert-circle', color: Corpus.danger, tint: Corpus.dangerTint },
  skipped: { label: 'Skipped', icon: 'remove-circle-outline', color: Corpus.textMuted, tint: Corpus.cardAlt },
};
const short = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1).replace('.0', '')}L` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : String(Math.round(n)));

// One day. A day with bills is a tinted tile showing the amount due; it gives a small bounce when chosen.
function Day({ day, list, today, on, onPress }: { day: number; list: { bill: Bill; state: State }[]; today: boolean; on: boolean; onPress: () => void }) {
  const k = useSharedValue(1);
  useEffect(() => { if (on) k.value = withSequence(withTiming(0.9, { duration: 70 }), withSpring(1, Spring.press)); }, [on, k]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const worst: State | null = !list.length ? null : list.some((x) => x.state === 'overdue') ? 'overdue' : list.some((x) => x.state === 'due') ? 'due' : list.some((x) => x.state === 'paid') ? 'paid' : 'skipped';
  const m = worst ? MARK[worst] : null;
  const total = list.reduce((a, x) => a + x.bill.amount, 0);
  return (
    <Pressable style={s.cell} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      accessibilityLabel={`${day}${list.length ? `, ${list.length} bill${list.length > 1 ? 's' : ''}, ${formatINR(total)}, ${m!.label}` : ', no bills'}`}>
      <Animated.View style={[s.day, m && { backgroundColor: m.tint }, today && s.dayToday, on && s.dayOn, st]}>
        <Text style={[s.dayText, m && s.dayBill, on && { color: Corpus.onGold }]}>{day}</Text>
        {m ? (
          <View style={s.amtRow}>
            <Ionicons name={m.icon} size={9} color={on ? Corpus.onGold : m.color} />
            <Text style={[s.amt, { color: on ? Corpus.onGold : m.color }]} numberOfLines={1}>{short(total)}</Text>
          </View>
        ) : <View style={{ height: 12 }} />}
      </Animated.View>
    </Pressable>
  );
}

// The month at a glance. Days with bills are tiles showing how much is due and whether it's paid.
// Tap a day to see its bills and pay from there; the arrows look ahead to the coming months.
export default function BillCalendar({ bills, onOpen, onPay }: { bills: Bill[]; onOpen?: (b: Bill) => void; onPay?: (b: Bill) => void }) {
  const now = new Date();
  const [ahead, setAhead] = useState(0); // 0 = this month, 1–3 = months ahead
  const view = ahead === 0 ? now : new Date(now.getFullYear(), now.getMonth() + ahead, 1);
  const year = view.getFullYear(), month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const byDay = new Map<number, { bill: Bill; state: State }[]>();
  const entries = monthEntries(bills, year, month, now);
  for (const { bill, date, state } of entries) {
    byDay.set(date.getDate(), [...(byDay.get(date.getDate()) ?? []), { bill, state }]);
  }
  const firstOpen = [...byDay.entries()].filter(([, l]) => l.some((x) => x.state === 'due' || x.state === 'overdue')).map(([d]) => d).sort((a, b) => a - b)[0];
  const [sel, setSel] = useState<number>(firstOpen ?? now.getDate());
  useEffect(() => { setSel(firstOpen ?? (ahead === 0 ? now.getDate() : [...byDay.keys()].sort((a, b) => a - b)[0] ?? 1)); }, [ahead]); // eslint-disable-line react-hooks/exhaustive-deps

  const cells: (number | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const picked = byDay.get(Math.min(sel, daysInMonth)) ?? [];
  const selDate = new Date(year, month, Math.min(sel, daysInMonth));
  const total = entries.reduce((a, x) => a + x.bill.amount, 0);
  const left = [...byDay.values()].flat().filter((x) => x.state === 'due' || x.state === 'overdue');
  const upcoming = bills.filter((b) => b.active).map((b) => ({ b, n: nextDue(b) })).filter((x) => x.n.daysAway >= 0).sort((a, b) => a.n.daysAway - b.n.daysAway)[0];

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} accessibilityRole="header">{view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <Text style={s.sum}>
            {entries.length === 0 ? 'No bills this month' : `${entries.length} bill${entries.length > 1 ? 's' : ''}, ${formatINR(total)}. ${ahead > 0 ? 'Coming up' : left.length ? `${left.length} to pay` : 'All paid'}`}
          </Text>
        </View>
        <Pressable style={[s.arrow, ahead === 0 && { opacity: 0.35 }]} disabled={ahead === 0} onPress={() => setAhead(ahead - 1)} accessibilityRole="button" accessibilityLabel="Earlier month" hitSlop={4}>
          <Ionicons name="chevron-back" size={18} color={Corpus.text} />
        </Pressable>
        <Pressable style={[s.arrow, ahead === 3 && { opacity: 0.35 }]} disabled={ahead === 3} onPress={() => setAhead(ahead + 1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={4}>
          <Ionicons name="chevron-forward" size={18} color={Corpus.text} />
        </Pressable>
      </View>

      <View style={s.week}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={[s.weekday, i > 4 && { color: Corpus.textFaint }]}>{d}</Text>)}
      </View>
      <Animated.View key={ahead} entering={FadeIn.duration(220)}>
        {weeks.map((week, w) => (
          <View key={w} style={s.week}>
            {week.map((day, i) => day
              ? <Day key={i} day={day} list={byDay.get(day) ?? []} today={ahead === 0 && day === now.getDate()} on={day === sel} onPress={() => setSel(day)} />
              : <View key={i} style={s.cell} />)}
          </View>
        ))}
      </Animated.View>

      <Animated.View key={`${ahead}-${sel}`} entering={FadeIn.duration(180)} style={s.detail}>
        <Text style={s.detailDate}>{ahead === 0 && sel === now.getDate() ? 'Today' : selDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {picked.length === 0 ? (
          <Text style={s.none}>
            Nothing due.{upcoming ? ` Next is ${upcoming.b.name} ${upcoming.n.daysAway === 0 ? 'today' : upcoming.n.daysAway === 1 ? 'tomorrow' : `on ${upcoming.n.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}.` : ''}
          </Text>
        ) : picked.map(({ bill, state }, i) => (
          <View key={`${bill.id}-${i}`} style={s.item}>
            <Pressable style={({ pressed }) => [s.itemMain, pressed && { opacity: 0.7 }]} onPress={() => onOpen?.(bill)} accessibilityRole="button">
              <Ionicons name={MARK[state].icon} size={18} color={MARK[state].color} />
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={1}>{bill.name}</Text>
                <Text style={[s.itemState, state !== 'due' && { color: MARK[state].color }]}>{MARK[state].label}</Text>
              </View>
              <Text style={s.itemAmt}>{bill.variable ? 'about ' : ''}{formatINR(bill.amount)}</Text>
            </Pressable>
            {ahead === 0 && (state === 'due' || state === 'overdue') && onPay && (
              <Pressable style={({ pressed }) => [s.pay, pressed && { opacity: 0.7 }]} onPress={() => onPay(bill)} accessibilityRole="button" accessibilityLabel={`Pay ${bill.name}`} hitSlop={4}>
                <Text style={s.payText}>Pay</Text>
              </Pressable>
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  sum: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: Type.small, fontFamily: Font.display, color: Corpus.textMuted, paddingBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: '92%', maxWidth: 46, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 1, borderWidth: 1.5, borderColor: 'transparent' },
  dayOn: { backgroundColor: Corpus.gold, borderColor: Corpus.gold },
  dayToday: { borderColor: Corpus.text },
  dayText: { fontSize: Type.bodyLg, color: Corpus.textMuted, ...tabular },
  dayBill: { color: Corpus.text, fontFamily: Font.displayBold },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 12 },
  amt: { fontSize: Type.micro, fontFamily: Font.display, ...tabular },
  detail: { marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border, gap: 8 },
  detailDate: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  none: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  itemName: { fontSize: Type.input, color: Corpus.text },
  itemState: { fontSize: Type.body, color: Corpus.textMuted },
  itemAmt: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  pay: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Corpus.gold, justifyContent: 'center' },
  payText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.onGold },
});

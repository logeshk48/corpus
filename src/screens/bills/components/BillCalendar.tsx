import { Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { isSkippedThisMonth, thisMonthBills } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type State = 'paid' | 'due' | 'overdue' | 'skipped';
// Each state has its own symbol as well as its colour, so it never depends on colour alone
export const MARK: Record<State, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  paid: { label: 'Paid', icon: 'checkmark-circle', color: Corpus.income },
  due: { label: 'Due', icon: 'ellipse', color: Corpus.text },
  overdue: { label: 'Overdue', icon: 'alert-circle', color: Corpus.danger },
  skipped: { label: 'Skipped', icon: 'remove-circle-outline', color: Corpus.textMuted },
};

// The month at a glance: every due day carries a mark. Tap a day to see what's due on it.
export default function BillCalendar({ bills, onOpen }: { bills: Bill[]; onOpen?: (b: Bill) => void }) {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const byDay = new Map<number, { bill: Bill; state: State }[]>();
  for (const { bill, date, paid } of thisMonthBills(bills, now)) {
    const state: State = isSkippedThisMonth(bill, now) ? 'skipped' : paid ? 'paid' : date.getDate() < now.getDate() ? 'overdue' : 'due';
    byDay.set(date.getDate(), [...(byDay.get(date.getDate()) ?? []), { bill, state }]);
  }
  // start on the next unpaid day, or today
  const nextOpen = [...byDay.entries()].filter(([, l]) => l.some((x) => x.state === 'due' || x.state === 'overdue')).map(([d]) => d).sort((a, b) => a - b)[0];
  const [sel, setSel] = useState<number>(nextOpen ?? now.getDate());
  const worst = (l: { state: State }[]): State => (l.some((x) => x.state === 'overdue') ? 'overdue' : l.some((x) => x.state === 'due') ? 'due' : l.some((x) => x.state === 'paid') ? 'paid' : 'skipped');

  const cells: (number | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const picked = byDay.get(sel) ?? [];
  const selDate = new Date(year, month, sel);

  return (
    <View style={s.card}>
      <Text style={s.title} accessibilityRole="header">{now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
      <View style={s.week}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={s.weekday}>{d}</Text>)}
      </View>
      {weeks.map((week, w) => (
        <View key={w} style={s.week}>
          {week.map((day, i) => {
            const list = day ? byDay.get(day) ?? [] : [];
            const m = list.length ? MARK[worst(list)] : null;
            const today = day === now.getDate();
            const on = day === sel;
            return (
              <Pressable key={i} style={s.cell} disabled={!day} onPress={() => day && setSel(day)} accessibilityRole={day ? 'button' : undefined}
                accessibilityLabel={day ? `${day}${list.length ? `, ${list.length} bill${list.length > 1 ? 's' : ''}, ${m!.label}` : ', no bills'}` : undefined} accessibilityState={{ selected: on }}>
                {day ? (
                  <View style={[s.day, on && s.dayOn, today && !on && s.dayToday]}>
                    <Text style={[s.dayText, list.length > 0 && s.dayBill, on && { color: Corpus.onGold }]}>{day}</Text>
                    {m ? <Ionicons name={m.icon} size={11} color={on ? Corpus.onGold : m.color} /> : <View style={{ height: 11 }} />}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={s.detail}>
        <Text style={s.detailDate}>{sel === now.getDate() ? 'Today' : selDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        {picked.length === 0 ? (
          <Text style={s.none}>Nothing due</Text>
        ) : picked.map(({ bill, state }) => (
          <Pressable key={bill.id} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]} onPress={() => onOpen?.(bill)} accessibilityRole="button">
            <Ionicons name={MARK[state].icon} size={16} color={MARK[state].color} />
            <Text style={s.itemName} numberOfLines={1}>{bill.name}</Text>
            <Text style={[s.itemState, { color: state === 'due' ? Corpus.textMuted : MARK[state].color }]}>{MARK[state].label}</Text>
            <Text style={s.itemAmt}>{formatINR(bill.amount)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 4 },
  title: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, marginBottom: 6 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: Type.small, color: Corpus.textMuted, paddingBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 40, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayOn: { backgroundColor: Corpus.gold },
  dayToday: { borderWidth: 1.5, borderColor: Corpus.text },
  dayText: { fontSize: Type.bodyLg, color: Corpus.textMuted, ...tabular },
  dayBill: { color: Corpus.text, fontFamily: Font.display },
  detail: { marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border, gap: 8 },
  detailDate: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  none: { fontSize: Type.body, color: Corpus.textMuted },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  itemName: { flex: 1, fontSize: Type.bodyLg, color: Corpus.text },
  itemState: { fontSize: Type.body },
  itemAmt: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text, ...tabular },
});

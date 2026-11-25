import { IconChip, Tap } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import type { Bill } from '@/types/bill';
import { monthlyBillsTotal, needsAmount, upcomingBills } from '@/utils/bills';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

function when(daysAway: number) {
  if (daysAway < 0) return { text: `${-daysAway} day${daysAway === -1 ? '' : 's'} late`, color: Corpus.danger };
  if (daysAway === 0) return { text: 'Due today', color: Corpus.warning };
  if (daysAway === 1) return { text: 'Due tomorrow', color: Corpus.warning };
  return { text: `In ${daysAway} days`, color: Corpus.textMuted };
}

// "Up next": the bills due in the next 7 days as a short calendar, each with its date on the left,
// then a line into all bills with what they cost a month.
export default function UpcomingBills({ bills, onPress }: { bills: Bill[]; onPress: () => void }) {
  const active = bills.filter((b) => b.active);
  const upcoming = upcomingBills(bills, 7).slice(0, 3);
  const total = upcoming.reduce((a, x) => a + x.bill.amount, 0);
  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.heading} accessibilityRole="header">Up next</Text>
        {upcoming.length > 0 && <Text style={s.headMeta}>{formatINR(total)} this week</Text>}
      </View>
      <Tap onPress={onPress} scaleTo={0.99} style={s.card} accessibilityRole="button" accessibilityLabel="Open bills">
        {active.length === 0 ? (
          <View style={s.row}>
            <IconChip icon="repeat" color={Chip.red} size={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.name}>Add your repeating bills</Text>
              <Text style={s.sub}>Rent, EMIs, phone. Corpus reminds you and sets the money aside.</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
          </View>
        ) : (
          <>
            {upcoming.length === 0 && (
              <View style={s.row}>
                <IconChip icon="checkmark" color={Chip.green} size={38} />
                <Text style={[s.name, { flex: 1 }]}>Nothing due in the next 7 days</Text>
              </View>
            )}
            {upcoming.map(({ bill, daysAway, date: d }) => {
              const w = needsAmount(bill) ? { text: "Enter this month's amount", color: Corpus.warning } : when(daysAway);
              const near = daysAway <= 1;
              return (
                <View key={bill.id} style={s.row}>
                  <View style={[s.date, near && { backgroundColor: Corpus.warningTint }]}>
                    <Text style={[s.dateDay, near && { color: Corpus.warning }]}>{d.getDate()}</Text>
                    <Text style={[s.dateMon, near && { color: Corpus.warning }]}>{d.toLocaleDateString('en-IN', { month: 'short' })}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.name} numberOfLines={1}>{bill.name}</Text>
                    <Text style={[s.sub, { color: w.color }]}>{w.text}</Text>
                  </View>
                  <Text style={s.amount}>{bill.variable ? '~' : ''}{formatINR(bill.amount)}</Text>
                </View>
              );
            })}
            <View style={s.foot}>
              <Text style={s.footText}>All bills, {formatINR(monthlyBillsTotal(bills))} a month</Text>
              <Ionicons name="chevron-forward" size={15} color={Corpus.textFaint} />
            </View>
          </>
        )}
      </Tap>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4 },
  heading: { flex: 1, fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
  headMeta: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  card: { backgroundColor: Corpus.card, borderRadius: 22, padding: 14, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { width: 44, height: 46, borderRadius: 12, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, lineHeight: 20, ...tabular },
  dateMon: { fontSize: Type.caption, color: Corpus.textMuted },
  name: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted },
  amount: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  footText: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
});

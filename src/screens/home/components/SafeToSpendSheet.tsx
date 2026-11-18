import { Sheet } from '@/components/ui';
import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = { visible: boolean; result: SafeToSpendResult; onClose: () => void };
type Step = { label: string; value: number; icon: string; note?: string };

// How today's number is worked out, step by step: what came in, each thing taken out (with what is left after it),
// then the rest shared across the days left. Each step shows its sign and an icon, not colour alone.
export default function SafeToSpendSheet({ visible, result, onClose }: Props) {
  if (!visible) return null;

  if (result.status === 'noData') {
    return (
      <Sheet title="How today's number works" subtitle="Your money for the month, shared fairly across the days left" onClose={onClose}>
        {[
          'Corpus takes what came in this month, or your monthly budget.',
          'It takes out what you have spent, bills still due, SIPs and what your jars need.',
          'What is left is shared equally across the days until your next pay day.',
        ].map((t, i) => (
          <View key={i} style={s.howRow}>
            <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
            <Text style={[s.line, { flex: 1 }]}>{t}</Text>
          </View>
        ))}
        <Text style={s.small}>Add income on the Add screen, or set a monthly budget in Budgets, to see your number.</Text>
      </Sheet>
    );
  }

  const r = result;
  const start = r.limitedByBudget ? r.monthlyBudget ?? 0 : r.income;
  const steps: Step[] = [
    { label: 'Spent so far', value: -r.spent, icon: 'cart' },
    ...(!r.limitedByBudget && r.movedToJars !== 0 ? [{ label: r.movedToJars > 0 ? 'Moved into jars' : 'Taken out of jars', value: -r.movedToJars, icon: 'file-tray-stacked' }] : []),
    ...(!r.limitedByBudget && r.plansDue > 0 ? [{ label: 'Kept for jar goals', value: -r.plansDue, icon: 'flag' }] : []),
    ...(r.billsDue > 0 ? [{ label: 'Bills still to pay', value: -r.billsDue, icon: 'receipt' }] : []),
    ...(!r.limitedByBudget && r.investing > 0 ? [{ label: 'SIPs this month', value: -r.investing, icon: 'trending-up', note: 'Invested, not spent, but not for spending either' }] : []),
    ...(r.setAside > 0 ? [{ label: 'Kept aside (your setting)', value: -r.setAside, icon: 'lock-closed' }] : []),
  ];
  let left = start;
  const rows = steps.map((st) => ({ ...st, after: (left += st.value) }));
  const pct = (n: number): `${number}%` => `${start > 0 ? Math.max(0, Math.min(1, n / start)) * 100 : 0}%`;
  const over = r.safeToday < 0;

  return (
    <Sheet title="How today's number works" subtitle="Your money for the month, shared fairly across the days left" onClose={onClose}>
      {/* the cascade: start, each step taken out, what is left */}
      <View style={s.box}>
        <View style={s.stepRow}>
          <View style={[s.icon, { backgroundColor: Corpus.incomeTint }]}><Ionicons name={r.limitedByBudget ? 'pie-chart' : 'arrow-down'} size={14} color={Corpus.income} /></View>
          <Text style={[s.label, { flex: 1 }]}>{r.limitedByBudget ? 'Your monthly budget' : 'Came in this month'}</Text>
          <Text style={s.value}>{formatINR(start)}</Text>
        </View>
        <View style={s.bar}><View style={{ width: '100%', backgroundColor: Corpus.income }} /></View>
        {rows.map((st) => (
          <View key={st.label} style={{ gap: 6 }}>
            <View style={s.stepRow}>
              <View style={s.icon}><Ionicons name={st.icon as keyof typeof Ionicons.glyphMap} size={14} color={Corpus.textMuted} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{st.label}</Text>
                {!!st.note && <Text style={s.small}>{st.note}</Text>}
              </View>
              <Text style={s.value}>{st.value <= 0 ? '−' : '+'}{formatINR(Math.abs(st.value))}</Text>
            </View>
            <View style={s.bar}><View style={{ width: pct(st.after), backgroundColor: st.after < 0 ? Corpus.danger : Corpus.textMuted }} /></View>
          </View>
        ))}
        <View style={s.total}>
          <Text style={[s.label, { flex: 1, fontFamily: Font.displayBold }]}>Left for {r.daysLeft} day{r.daysLeft === 1 ? '' : 's'}</Text>
          <Text style={[s.totalValue, r.available < 0 && { color: Corpus.danger }]}>{r.available < 0 ? '−' : ''}{formatINR(Math.abs(r.available))}</Text>
        </View>
      </View>
      {r.limitedByBudget && r.plansDue > 0 && (
        <View style={s.tip}>
          <Ionicons name="file-tray-stacked" size={16} color={Corpus.text} />
          <Text style={[s.small, { flex: 1, color: Corpus.text }]}>{formatINR(r.plansDue)} for your jar goals is kept from what came in, outside this budget, so it is not taken out again here.</Text>
        </View>
      )}
      {r.plansPaused.map((pp) => (
        <View key={pp.name} style={s.warn}>
          <Ionicons name="pause-circle" size={16} color={Corpus.warning} />
          <Text style={[s.small, { flex: 1, color: Corpus.text }]}>{pp.name} plan is paused. It needs {formatINR(pp.need)} this month, more than half your income. Open the jar to pick a date that fits.</Text>
        </View>
      ))}

      {/* from the month to today */}
      <View style={s.box}>
        <View style={s.stepRow}>
          <Text style={[s.label, { flex: 1 }]}>Shared across {r.daysLeft} day{r.daysLeft === 1 ? '' : 's'}</Text>
          <Text style={s.value}>{formatINR(r.dailyAllowance)} a day</Text>
        </View>
        <View style={s.stepRow}>
          <Text style={[s.label, { flex: 1 }]}>Spent today</Text>
          <Text style={s.value}>−{formatINR(r.spentToday)}</Text>
        </View>
        <View style={s.total}>
          <Ionicons name={over ? 'alert-circle' : 'checkmark-circle'} size={18} color={over ? Corpus.danger : Corpus.income} />
          <Text style={[s.label, { flex: 1, fontFamily: Font.displayBold }]}>{over ? 'Over today by' : 'Safe to spend today'}</Text>
          <Text style={[s.totalValue, { color: over ? Corpus.danger : Corpus.income }]}>{formatINR(Math.abs(r.safeToday))}</Text>
        </View>
      </View>

      {r.daysLeft > 1 && (
        <View style={s.tip}>
          <Ionicons name="sunny" size={18} color={Corpus.text} />
          <Text style={[s.line, { flex: 1 }]}>Spend nothing more today and from tomorrow you have <Text style={s.strong}>{formatINR(r.tomorrowAllowance)} a day</Text>. Every rupee not spent today makes the next days a little bigger.</Text>
        </View>
      )}
      <Text style={s.small}>
        {r.limitedByBudget ? 'Your monthly budget is lower than what came in, so Corpus uses the budget. ' : r.monthlyBudget ? 'What came in is lower than your monthly budget, so Corpus uses that. ' : ''}
        Jar money and bills still to pay are never counted as spendable. Category budgets don't change this number; they warn you on Budgets.
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 14, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 26, height: 26, borderRadius: 8, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: Type.body, color: Corpus.text },
  value: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text, ...tabular },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Corpus.cardAlt, marginLeft: 36 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  totalValue: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Corpus.warningTint, borderRadius: 14, padding: 12 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Corpus.bg, borderRadius: 14, padding: 12 },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  strong: { fontFamily: Font.displayBold },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  howRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: Type.small, fontFamily: Font.displayBold, color: Corpus.text },
});

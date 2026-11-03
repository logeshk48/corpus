import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useWealth } from '@/hooks/useWealth';
import { allDebts, debtTotals, type DebtKind, type DebtLine } from '@/utils/allDebts';
import { formatINR, formatINRLong } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { saveSettings } from '@/services/settings';
import { simulatePayoff, type Strategy } from '@/utils/payoff';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './DebtsScreen.styles';

const KIND: Record<DebtKind, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  loan: { label: 'Loan', icon: 'business-outline' },
  emi: { label: 'EMI', icon: 'calendar-outline' },
  card: { label: 'Credit card', icon: 'card-outline' },
  person: { label: 'Borrowed', icon: 'person-outline' },
};
// how expensive is this rate?
const heat = (r: number | null) =>
  r == null ? { bg: Corpus.cardAlt, fg: Corpus.textMuted, word: 'rate ?' }
  : r >= 24 ? { bg: Corpus.dangerTint, fg: Corpus.danger, word: 'very costly' }
  : r >= 12 ? { bg: Corpus.warningTint, fg: Corpus.warning, word: 'costly' }
  : r > 0 ? { bg: Corpus.goldTint, fg: Corpus.gold, word: 'moderate' }
  : { bg: Corpus.incomeTint, fg: Corpus.income, word: 'interest-free' };

export default function DebtsScreen() {
  const router = useRouter();
  const w = useWealth();
  const list = useMemo(() => allDebts({ ious: w.ious, bills: w.bills, accounts: w.accounts }), [w.ious, w.bills, w.accounts]);
  const t = debtTotals(list);

  // Payoff plan (choices saved)
  const { settings } = useSettings();
  const [strategy, setStrategy] = useState<Strategy>(settings.debtPlan?.strategy ?? 'avalanche');
  const [extra, setExtra] = useState(settings.debtPlan?.extra ?? 0);
  const [custom, setCustom] = useState('');
  const choose = (s: Strategy, e: number) => {
    setStrategy(s);
    setExtra(e);
    saveSettings({ debtPlan: { strategy: s, extra: e } }).catch(() => {});
  };
  const pdebts = useMemo(() => list.map((d) => ({ id: d.id, name: d.name, balance: d.balance, rate: d.rate, minPay: d.monthlyPay })), [list]);
  const plan = useMemo(() => simulatePayoff(pdebts, extra, strategy), [pdebts, extra, strategy]);
  const first = list.find((d) => d.id === plan.firstTarget);
  const monthName = (m: number | null) => (m == null ? 'not at this pace' : new Date(new Date().getFullYear(), new Date().getMonth() + m, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="All debts" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {w.loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={40} color={Corpus.income} />
            <Text style={styles.emptyTitle}>You’re debt-free</Text>
            <Text style={styles.meta}>No loans, EMIs, card balances or money owed to people.</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>YOU OWE IN TOTAL</Text>
              <Text style={styles.heroValue}>{formatINRLong(t.total)}</Text>
              <Text style={styles.heroSub}>{list.length} debt{list.length > 1 ? 's' : ''} · costliest first</Text>
            </View>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>Paying a month</Text>
                <Text style={styles.tileValue}>{formatINR(t.monthly)}</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>Interest a month (approx.)</Text>
                <Text style={[styles.tileValue, { color: Corpus.danger }]}>{formatINR(t.interest)}</Text>
              </View>
            </View>

            <SectionLabel>YOUR PAYOFF PLAN</SectionLabel>
            <View style={styles.card}>
              <View style={sheet.chips}>
                {(['avalanche', 'snowball'] as const).map((k) => (
                  <Pressable key={k} style={[sheet.chip, strategy === k && sheet.chipSuggested]} onPress={() => choose(k, extra)}>
                    <Text style={[sheet.chipText, strategy === k && sheet.chipTextSuggested]}>{k === 'avalanche' ? 'Highest interest first' : 'Smallest first'}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.meta}>
                {strategy === 'avalanche' ? 'Saves the most interest — the mathematically best order.' : 'Clears small debts quickly — fewer debts sooner keeps you going.'}
              </Text>
              <Text style={[styles.tileLabel, { marginTop: 6 }]}>EXTRA I CAN PAY EACH MONTH (ON TOP OF EMIs / MINIMUMS)</Text>
              <View style={sheet.chips}>
                {[0, 2000, 5000, 10000].map((e) => (
                  <Pressable key={e} style={[sheet.chip, extra === e && sheet.chipSuggested]} onPress={() => (setCustom(''), choose(strategy, e))}>
                    <Text style={[sheet.chipText, extra === e && sheet.chipTextSuggested]}>{e ? formatINR(e) : 'None'}</Text>
                  </Pressable>
                ))}
                <TextInput
                  style={[sheet.chip, { minWidth: 90, color: Corpus.text }]}
                  value={custom}
                  onChangeText={(v) => {
                    const n = v.replace(/\D/g, '');
                    setCustom(n);
                    if (n) choose(strategy, Number(n));
                  }}
                  placeholder="Other ₹"
                  placeholderTextColor={Corpus.textFaint}
                  keyboardType="number-pad"
                />
              </View>

              {first && (
                <View style={{ backgroundColor: Corpus.goldTint, borderRadius: 12, padding: 12, gap: 4, marginTop: 4 }}>
                  <Text style={[styles.tileLabel, { color: Corpus.gold, fontWeight: '700' }]}>PAY THIS FIRST</Text>
                  <Text style={styles.name}>{first.name} · {formatINR(first.balance)}</Text>
                  <Text style={styles.meta}>
                    {extra > 0
                      ? `Put the extra ${formatINR(extra)} here every month. Keep paying the usual EMI / minimum on everything else.`
                      : `Any extra money you can find goes here first. Keep paying the usual EMI / minimum on everything else.`}
                    {first.rate ? ` It charges ${first.rate}% a year — ${first.kind === 'card' ? 'the costliest money there is' : 'your costliest debt'}.` : ''}
                  </Text>
                </View>
              )}

              {plan.order.map((o, i) => {
                const d = list.find((x) => x.id === o.id)!;
                return (
                  <View key={o.id} style={[styles.row, { paddingVertical: 4 }]}>
                    <Text style={[styles.name, { width: 22, color: i === 0 ? Corpus.gold : Corpus.textMuted }]}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meta} numberOfLines={1}>
                        <Text style={{ color: Corpus.text }}>{d.name}</Text> · {formatINR(d.balance)}{d.rate != null ? ` · ${d.rate}%` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.meta, o.month == null && { color: Corpus.danger }]}>{o.month == null ? 'never at this pace' : `clear by ${monthName(o.month)}`}</Text>
                  </View>
                );
              })}
            </View>

            <SectionLabel right="Highest interest first">YOUR DEBTS</SectionLabel>
            {list.map((d: DebtLine) => {
              const h = heat(d.rate);
              return (
                <Pressable key={d.id} style={styles.card} onPress={() => router.push(d.link as Href)}>
                  <View style={styles.row}>
                    <View style={styles.icon}>
                      <Ionicons name={KIND[d.kind].icon} size={18} color={h.fg} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.name} numberOfLines={1}>{d.name}</Text>
                      <Text style={styles.meta}>
                        {KIND[d.kind].label}
                        {d.monthlyPay ? ` · ${formatINR(d.monthlyPay)}/month${d.kind === 'card' ? ' min. due' : d.kind === 'person' ? ' interest' : ''}` : ''}
                        {d.monthsLeft ? ` · ${d.monthsLeft} left` : ''}
                      </Text>
                    </View>
                    <Text style={styles.value}>{formatINR(d.balance)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: h.bg }]}>
                    <Text style={[styles.badgeText, { color: h.fg }]}>
                      {d.rate != null ? `${d.rate}% · ` : ''}{h.word}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {d.rateNote}
                    {d.interestPerMonth ? ` · costs about ${formatINR(d.interestPerMonth)} a month in interest` : ''}
                  </Text>
                </Pressable>
              );
            })}
            {t.unknownRates > 0 && (
              <Text style={styles.note}>
                {t.unknownRates} EMI{t.unknownRates > 1 ? 's have' : ' has'} no interest rate yet. Open it and add the loan details (amount, rate, tenure) — your loan statement or bank app has them — to see the real cost and a payoff plan.
              </Text>
            )}
            <Text style={styles.note}>Card rate assumed at ~42% a year (3.5% a month), what most Indian cards charge when the bill isn’t paid in full. Interest a month is approximate: balance × rate ÷ 12.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useWealth } from '@/hooks/useWealth';
import { allDebts, debtBurden, debtTotals, minimumTrap, type DebtKind, type DebtLine } from '@/utils/allDebts';
import { recentAverage } from '@/utils/wealthScore';
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

  // Debt burden: payments ÷ income (banks call it FOIR)
  const income = recentAverage(w.inputs.flows)?.income ?? 0;
  const burden = debtBurden(t.monthly, income);
  const BAND = {
    healthy: { c: Corpus.income, t: 'Healthy', say: 'Comfortable — you have room if something goes wrong.' },
    stretched: { c: Corpus.gold, t: 'Stretched', say: 'Manageable, but avoid any new loan or EMI for now.' },
    risky: { c: Corpus.warning, t: 'Risky', say: 'A job loss or big bill could make you miss payments. Clear the costliest debt first.' },
    danger: { c: Corpus.danger, t: 'Too heavy', say: 'More than half your income goes to debt. Most lenders won’t give new loans, and one missed month hurts your credit score.' },
  };
  const cards = w.accounts.filter((a) => a.type === 'credit' && !a.archived && a.balance > 0);

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
  // compare with paying only EMIs / minimums
  const base = useMemo(() => simulatePayoff(pdebts, 0, strategy), [pdebts, strategy]);
  const ladder = useMemo(() => [0, 2000, 5000, 10000, 20000].map((e) => ({ e, r: simulatePayoff(pdebts, e, strategy) })), [pdebts, strategy]);
  const span = (m: number) => {
    const y = Math.floor(m / 12), mo = m % 12;
    return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', mo ? `${mo} mo` : ''].filter(Boolean).join(' ') || '0 mo';
  };
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

            {burden ? (
              <View style={styles.card}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.name}>Debt burden</Text>
                  <Text style={[styles.name, { color: BAND[burden.band].c }]}>{BAND[burden.band].t}</Text>
                </View>
                <Text style={styles.meta}>
                  <Text style={{ color: Corpus.text, fontWeight: '600' }}>{Math.round(burden.pct)}% of your income</Text> ({formatINR(t.monthly)} of {formatINR(Math.round(income))} a month) goes to EMIs, card minimums and interest.
                </Text>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: Corpus.cardAlt, overflow: 'hidden', marginTop: 4 }}>
                  <View style={{ width: `${Math.min(100, (burden.pct / 60) * 100)}%`, height: 8, backgroundColor: BAND[burden.band].c }} />
                </View>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.note}>0%</Text>
                  <Text style={styles.note}>30% safe</Text>
                  <Text style={styles.note}>50% bank limit</Text>
                  <Text style={styles.note}>60%</Text>
                </View>
                <Text style={styles.meta}>{BAND[burden.band].say}</Text>
                <Text style={styles.meta}>
                  {burden.band === 'healthy'
                    ? `You could take ${formatINR(burden.safeRoom)} more in EMIs and stay under 30%. Lenders usually allow up to ${formatINR(burden.bankRoom)} more — but that’s their limit, not a safe one.`
                    : `Bring payments down by ${formatINR(burden.toHealthy)} a month to get under 30%. Closing a loan or clearing a card frees its whole payment.`}
                </Text>
              </View>
            ) : (
              <Text style={styles.note}>Log your income to see what share of it goes to debt.</Text>
            )}

            {cards.map((c) => {
              const trap = minimumTrap(c.balance);
              const used = c.creditLimit ? Math.round((c.balance / c.creditLimit) * 100) : null;
              return (
                <View key={c.id} style={[styles.card, { borderColor: Corpus.dangerLine }]}>
                  <View style={styles.row}>
                    <Ionicons name="warning-outline" size={18} color={Corpus.danger} />
                    <Text style={[styles.name, { flex: 1 }]}>{c.name}: {formatINR(Math.round(c.balance))} on the card</Text>
                  </View>
                  <Text style={styles.meta}>
                    Paying only the minimum due, this takes <Text style={{ color: Corpus.danger, fontWeight: '600' }}>{trap.months >= 600 ? '50+ years' : span(trap.months)}</Text> and costs about{' '}
                    <Text style={{ color: Corpus.danger, fontWeight: '600' }}>{formatINR(trap.interest)} in interest</Text>.
                  </Text>
                  <Text style={styles.meta}>
                    Pay the full statement amount by the due date{c.dueDay ? ` (the ${c.dueDay}${c.dueDay === 1 ? 'st' : c.dueDay === 2 ? 'nd' : c.dueDay === 3 ? 'rd' : 'th'})` : ''}. Carry any balance and the interest-free period goes, so even new purchases start charging interest from day one.
                  </Text>
                  {used != null && (
                    <Text style={[styles.meta, used > 30 && { color: Corpus.warning }]}>
                      Using {used}% of your {formatINR(c.creditLimit!)} limit.{used > 30 ? ' Above 30% pulls your credit score down — keep it lower even if you pay in full.' : ' Under 30% — good for your credit score.'}
                    </Text>
                  )}
                  {used == null && <Text style={styles.note}>Add the card’s credit limit in Accounts to see how it affects your credit score.</Text>}
                </View>
              );
            })}

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

              <View style={{ alignItems: 'center', gap: 2, paddingVertical: 8 }}>
                <Text style={styles.tileLabel}>DEBT-FREE BY</Text>
                <Text style={[styles.heroValue, { color: plan.months == null ? Corpus.danger : Corpus.income }]}>{plan.months == null ? 'Not at this pace' : monthName(plan.months)}</Text>
                {plan.months != null && <Text style={styles.heroSub}>in {span(plan.months)} · {formatINR(plan.interest)} interest from now</Text>}
                {extra > 0 && base.months != null && plan.months != null && base.months > plan.months && (
                  <Text style={[styles.heroSub, { color: Corpus.income, fontWeight: '600' }]}>
                    {span(base.months - plan.months)} sooner and {formatINR(base.interest - plan.interest)} less interest than paying only EMIs / minimums ({monthName(base.months)})
                  </Text>
                )}
                {extra > 0 && base.months == null && plan.months != null && (
                  <Text style={[styles.heroSub, { color: Corpus.income, fontWeight: '600' }]}>Paying only minimums you’d never finish — this extra gets you out.</Text>
                )}
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Pressable style={[sheet.chip, { paddingHorizontal: 16 }]} onPress={() => (setCustom(''), choose(strategy, Math.max(0, extra - 1000)))}>
                    <Text style={sheet.chipText}>− ₹1,000</Text>
                  </Pressable>
                  <Text style={[styles.name, { minWidth: 90, textAlign: 'center' }]}>{formatINR(extra)}/mo</Text>
                  <Pressable style={[sheet.chip, { paddingHorizontal: 16 }]} onPress={() => (setCustom(''), choose(strategy, extra + 1000))}>
                    <Text style={sheet.chipText}>+ ₹1,000</Text>
                  </Pressable>
                </View>
              </View>
              {plan.stuck.length > 0 && (
                <Text style={[styles.meta, { color: Corpus.danger }]}>
                  {plan.stuck.join(', ')} {plan.stuck.length > 1 ? "don't" : "doesn't"} go down at this pace — you only cover the interest. Add some extra each month to start clearing it.
                </Text>
              )}

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

            <View style={styles.card}>
              <Text style={styles.name}>What extra money buys you</Text>
              {ladder.map(({ e, r }) => (
                <Pressable key={e} style={[styles.row, { paddingVertical: 4 }]} onPress={() => (setCustom(''), choose(strategy, e))}>
                  <Text style={[styles.meta, { width: 110, color: e === extra ? Corpus.gold : Corpus.text, fontWeight: e === extra ? '700' : '400' }]}>{e ? `+${formatINR(e)}/mo` : 'Only minimums'}</Text>
                  <Text style={[styles.meta, { flex: 1 }]}>{r.months == null ? 'never' : `free by ${monthName(r.months)}`}</Text>
                  <Text style={styles.meta}>{r.months == null ? '—' : `${formatINR(r.interest)} interest`}</Text>
                </Pressable>
              ))}
              <Text style={styles.note}>Tap a row to use it. Interest is what you’d still pay from today until each debt is cleared.</Text>
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

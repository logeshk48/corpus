import Shine from '@/components/fx/Shine';
import { Button, Choice, Field, Group, GroupRow, IconChip, Screen } from '@/components/ui';
import { Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTween } from '@/hooks/useTween';
import { useWealth } from '@/hooks/useWealth';
import { saveSettings } from '@/services/settings';
import { allDebts, cardWaysOut, debtBurden, debtTotals, type DebtKind, type DebtLine } from '@/utils/allDebts';
import { debtPlanSummary, planStart } from '@/utils/debtPlan';
import { formatINR } from '@/utils/format';
import { simulatePayoff, type Strategy } from '@/utils/payoff';
import { recentAverage } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const KIND: Record<DebtKind, { label: string; icon: string }> = {
  loan: { label: 'Loan', icon: 'business' },
  emi: { label: 'EMI', icon: 'calendar' },
  card: { label: 'Credit card', icon: 'card' },
  person: { label: 'Borrowed', icon: 'person' },
};
// How expensive a rate is, in a word (always next to the number, never colour alone)
const heat = (r: number | null) =>
  r == null ? { color: Chip.gray, word: 'Rate not known' }
  : r >= 24 ? { color: Chip.red, word: 'Very costly' }
  : r >= 12 ? { color: Chip.orange, word: 'Costly' }
  : r > 0 ? { color: Chip.yellow, word: 'Moderate' }
  : { color: Chip.green, word: 'Interest-free' };
const BAND = {
  healthy: { color: Corpus.income, icon: 'checkmark-circle', word: 'Healthy', say: 'You have room if something goes wrong.' },
  stretched: { color: Corpus.warning, icon: 'remove-circle', word: 'Stretched', say: 'Manageable, but avoid any new loan or EMI for now.' },
  risky: { color: Corpus.danger, icon: 'alert-circle', word: 'Risky', say: 'A lean month could mean a missed payment. Clear the costliest debt first.' },
  danger: { color: Corpus.danger, icon: 'alert-circle', word: 'Too heavy', say: 'More than half your income goes to debt. Most lenders will refuse new loans, and one missed payment hurts your credit score.' },
} as const;
const EXTRAS = [0, 1000, 2000, 5000, 10000];
const span = (m: number) => {
  const y = Math.floor(m / 12), mo = m % 12;
  return [y ? `${y} year${y > 1 ? 's' : ''}` : '', mo ? `${mo} month${mo > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ') || 'this month';
};
const monthName = (m: number | null) => (m == null ? 'Not at this pace' : new Date(new Date().getFullYear(), new Date().getMonth() + m, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));

export default function DebtsScreen() {
  const router = useRouter();
  const w = useWealth();
  const { settings } = useSettings();
  const list = useMemo(() => allDebts({ ious: w.ious, bills: w.bills, accounts: w.accounts }), [w.ious, w.bills, w.accounts]);
  const t = debtTotals(list);
  const income = recentAverage(w.inputs.flows)?.income ?? 0;
  const burden = debtBurden(t.monthly, income);
  const cards = list.filter((d) => d.kind === 'card');
  const progress = debtPlanSummary({ ious: w.ious, bills: w.bills, accounts: w.accounts, plan: settings.debtPlan, cycleStartDay: settings.cycleStartDay });

  // ── The plan (choices are saved, so Home and reminders follow them) ──
  const [strategy, setStrategy] = useState<Strategy>(settings.debtPlan?.strategy ?? 'avalanche');
  const [extra, setExtra] = useState(settings.debtPlan?.extra ?? 0);
  const [custom, setCustom] = useState(EXTRAS.includes(settings.debtPlan?.extra ?? 0) ? '' : String(settings.debtPlan?.extra ?? ''));
  // Settings arrive after the first render: take the saved plan once it is here (unless you already changed it)
  const touched = useRef(false);
  useEffect(() => {
    const dp = settings.debtPlan;
    if (!dp || touched.current) return;
    setStrategy(dp.strategy ?? 'avalanche');
    setExtra(dp.extra ?? 0);
    setCustom(EXTRAS.includes(dp.extra ?? 0) ? '' : String(dp.extra ?? ''));
  }, [settings.debtPlan]);
  const choose = (s: Strategy, e: number) => {
    touched.current = true;
    setStrategy(s);
    setExtra(e);
    const cur = settings.debtPlan;
    saveSettings({ debtPlan: { ...(cur ?? {}), ...(cur?.startedAt ? {} : planStart(list)), strategy: s, extra: e } }).catch(() => {});
  };
  const pdebts = useMemo(() => list.map((d) => ({ id: d.id, name: d.name, balance: d.balance, rate: d.rate, minPay: d.monthlyPay })), [list]);
  const plans = useMemo(() => ({ avalanche: simulatePayoff(pdebts, extra, 'avalanche'), snowball: simulatePayoff(pdebts, extra, 'snowball') }), [pdebts, extra]);
  const plan = plans[strategy];
  const base = useMemo(() => simulatePayoff(pdebts, 0, strategy), [pdebts, strategy]);
  const ladder = useMemo(() => EXTRAS.map((e) => ({ e, r: simulatePayoff(pdebts, e, strategy) })), [pdebts, strategy]);
  const first = list.find((d) => d.id === plan.firstTarget);
  const firstClear = (r: typeof plan) => r.order.reduce<number | null>((m, o) => (o.month != null && (m == null || o.month < m) ? o.month : m), null);
  const sameOrder = plans.avalanche.order.map((o) => o.id).join() === plans.snowball.order.map((o) => o.id).join();
  const owed = useTween(t.total);

  return (
    <Screen title="Debts" tone={Chip.orange} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {w.loading ? (
        <View style={[s.card, { height: 240 }]} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
      ) : list.length === 0 ? (
        <View style={[s.card, s.empty]}>
          <IconChip icon="happy" color={Chip.green} size={48} />
          <Text style={s.h}>You're debt-free</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>No loans, EMIs, card balances or money owed to people. Every rupee you earn is yours.</Text>
        </View>
      ) : (
        <>
          {/* 1. How much, when it ends, and what it costs each month */}
          <View style={[s.card, s.hero]}>
            <Shine />
            <Text style={s.muted}>You owe</Text>
            <Text style={s.big}>{formatINR(Math.round(owed))}</Text>
            <Text style={s.line}>
              {plan.months == null ? <Text style={{ color: Corpus.danger }}>Not paid off within 50 years at this pace.</Text>
                : <>Debt-free by <Text style={s.strong}>{monthName(plan.months)}</Text>, in {span(plan.months)}.</>}
            </Text>
            {progress.started && progress.startTotal > 0 && progress.paidOff < 1 && (
              <Text style={s.small}>Your plan started in {progress.started.toLocaleDateString('en-IN', { month: 'long' })}. Progress shows here as the balances go down.</Text>
            )}
            {progress.started && progress.startTotal > 0 && progress.paidOff >= 1 && (
              <View style={{ gap: 6 }}>
                <View style={s.bar}><View style={{ width: `${progress.pct * 100}%`, backgroundColor: Corpus.income }} /></View>
                <Text style={s.small}>
                  <Text style={s.strong}>{formatINR(Math.round(progress.paidOff))}</Text> paid off since {progress.started.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}, {Math.round(progress.pct * 100)}% of the way.
                  {progress.streak > 1 ? ` Extra paid ${progress.streak} months in a row.` : ''}
                </Text>
              </View>
            )}
            <View style={s.strip}>
              <View style={s.stat}><Text style={s.small}>You pay a month</Text><Text style={s.statNum}>{formatINR(t.monthly)}</Text></View>
              <View style={[s.stat, s.ruled]}>
                <Text style={s.small}>Of it, interest</Text>
                <Text style={[s.statNum, t.interest > 0 && { color: Corpus.danger }]}>{formatINR(t.interest)}</Text>
              </View>
              <View style={[s.stat, s.ruled]}><Text style={s.small}>Debts</Text><Text style={s.statNum}>{list.length}</Text></View>
            </View>
          </View>

          {/* 2. The one thing to do */}
          {first && (
            <View style={[s.card, { gap: 10 }]}>
              <Text style={s.h}>Pay this first</Text>
              <View style={s.row}>
                <IconChip icon={KIND[first.kind].icon} color={heat(first.rate).color} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.name}>{first.name}</Text>
                  <Text style={s.small}>{first.rate != null ? `${first.rate}% a year. ${heat(first.rate).word}` : 'Rate not known'}</Text>
                </View>
                <Text style={s.amount}>{formatINR(first.balance)}</Text>
              </View>
              <Text style={s.line}>
                {extra > 0 ? `Put your extra ${formatINR(extra)} here every month` : 'Put any extra money you find here first'}, and keep paying the usual EMI or minimum on the rest.
                {strategy === 'avalanche' && first.rate ? ` It charges the most interest, so every rupee here saves the most.` : strategy === 'snowball' ? ' It is the smallest, so it is gone soonest.' : ''}
              </Text>
              {first.kind === 'card' && <Text style={s.small}>Then pay each new card bill in full, so this does not grow back.</Text>}
            </View>
          )}

          {/* 3. A card balance: the trap, and cheaper ways out */}
          {cards.map((c) => {
            const o = cardWaysOut(c.balance);
            return (
              <View key={c.id} style={[s.card, { gap: 10 }]}>
                <View style={s.row}>
                  <IconChip icon="warning" color={Chip.red} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{formatINR(c.balance)} on {c.name}</Text>
                    <Text style={s.small}>About 42% a year while it is not paid in full</Text>
                  </View>
                </View>
                <Text style={s.line}>
                  Pay only the minimum and it takes <Text style={[s.strong, { color: Corpus.danger }]}>{o.minimum.months >= 600 ? 'over 50 years' : span(o.minimum.months)}</Text> and about <Text style={[s.strong, { color: Corpus.danger }]}>{formatINR(o.minimum.cost)}</Text> in interest. While any balance is carried, new spends on the card are charged interest from day one too.
                </Text>
                <Text style={s.label}>Cheaper ways out, cleared in 12 months</Text>
                <View style={s.ways}>
                  {[
                    { k: 'emi', t: "Card's own EMI", sub: `About 16% plus a fee. ${formatINR(o.cardEmi.emi)} a month. Quick, done in the card app`, cost: o.cardEmi.cost, best: o.cardEmi.cost <= o.loan.cost },
                    { k: 'loan', t: 'Personal loan', sub: `About 13% plus a 2% fee. ${formatINR(o.loan.emi)} a month. Needs paperwork and a credit check`, cost: o.loan.cost, best: o.loan.cost < o.cardEmi.cost },
                    { k: 'min', t: 'Minimum due only', sub: o.minimum.months >= 600 ? 'Over 50 years' : `Takes ${span(o.minimum.months)}`, cost: o.minimum.cost, best: false },
                  ].map((x, i) => (
                    <View key={x.k} style={[s.way, i > 0 && s.wayLine]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={s.row}>
                          <Text style={s.name}>{x.t}</Text>
                          {x.best && <View style={s.tag}><Text style={s.tagText}>Cheapest</Text></View>}
                        </View>
                        <Text style={s.small}>{x.sub}</Text>
                      </View>
                      <Text style={[s.amount, x.k === 'min' && { color: Corpus.danger }]}>{formatINR(x.cost)}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.note}>Cost = interest plus fees and GST. Ask your bank for its exact EMI rate first. Cheapest of all is paying it off from savings, but keep your safety cushion.</Text>
              </View>
            );
          })}

          {/* 4. How heavy it is next to your income */}
          {burden ? (
            <View style={[s.card, { gap: 10 }]}>
              <View style={s.row}>
                <Text style={[s.h, { flex: 1 }]}>How heavy it is</Text>
                <Ionicons name={BAND[burden.band].icon} size={16} color={BAND[burden.band].color} />
                <Text style={[s.name, { color: BAND[burden.band].color }]}>{BAND[burden.band].word}</Text>
              </View>
              <Text style={s.line}><Text style={s.strong}>{Math.round(burden.pct)}% of your income</Text> ({formatINR(t.monthly)} of about {formatINR(Math.round(income))} a month) goes to EMIs, card minimums and interest.</Text>
              <View>
                <View style={s.bar}><View style={{ width: `${Math.min(100, (burden.pct / 60) * 100)}%`, backgroundColor: BAND[burden.band].color }} /></View>
                {[30, 40, 50].map((m) => <View key={m} style={[s.tick, { left: `${(m / 60) * 100}%` }]} />)}
              </View>
              <View style={s.row}>
                <Text style={[s.scale, { flex: 30 }]}>Under 30% is healthy</Text>
                <Text style={[s.scale, { flex: 20, textAlign: 'center' }]}>40% lenders worry</Text>
                <Text style={[s.scale, { flex: 10, textAlign: 'right' }]}>50%+</Text>
              </View>
              <Text style={s.small}>
                {BAND[burden.band].say}{' '}
                {burden.band === 'healthy' ? `You could add up to ${formatINR(burden.safeRoom)} of EMIs and stay under 30%, but less is better.` : `Bring payments down by ${formatINR(burden.toHealthy)} a month to get under 30%. Clearing one debt frees its whole payment.`}
              </Text>
            </View>
          ) : <Text style={s.note}>Log your income to see what share of it goes to debt.</Text>}

          {/* 5. The plan: order, extra money, and what it buys */}
          <View style={[s.card, { gap: 14 }]}>
            <Text style={s.h}>Your payoff plan</Text>
            <Text style={s.small}>Which debt gets your extra money first?</Text>
            <View style={s.tiles}>
              {(['avalanche', 'snowball'] as const).map((k) => {
                const r = plans[k];
                const on = strategy === k;
                const fc = firstClear(r);
                return (
                  <Pressable key={k} onPress={() => choose(k, extra)} style={({ pressed }) => [s.tile, on && s.tileOn, pressed && { opacity: 0.85 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <View style={s.row}>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? Corpus.onGold : Corpus.textMuted} />
                      <Text style={[s.name, on && { color: Corpus.onGold }]}>{k === 'avalanche' ? 'Save the most' : 'Quick wins'}</Text>
                    </View>
                    <Text style={[s.small, on && { color: Corpus.onGold }]}>{k === 'avalanche' ? 'Highest interest first' : 'Smallest debt first'}</Text>
                    <Text style={[s.tileNum, on && { color: Corpus.onGold }]}>{formatINR(r.interest)}</Text>
                    <Text style={[s.small, on && { color: Corpus.onGold }]}>in interest</Text>
                    <Text style={[s.small, on && { color: Corpus.onGold }]}>Free by {monthName(r.months)}</Text>
                    <Text style={[s.small, on && { color: Corpus.onGold }]}>First debt gone {fc == null ? 'later' : fc === 0 ? 'this month' : `by ${monthName(fc)}`}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.small}>
              {sameOrder ? 'For your debts both orders are the same, so pick either.'
                : plans.snowball.interest > plans.avalanche.interest
                  ? `Quick wins costs ${formatINR(plans.snowball.interest - plans.avalanche.interest)} more in interest. Research finds clearing small debts first keeps many people going, so pick what you will stick with.`
                  : 'Both cost about the same here.'}
            </Text>

            <Choice label="Extra I can pay each month, on top of EMIs and minimums" options={EXTRAS.map((e) => ({ value: String(e), label: e ? formatINR(e) : 'None' }))}
              value={custom ? '' : String(extra)} onChange={(v) => { setCustom(''); choose(strategy, Number(v)); }} />
            <Field label="Or type an amount" money value={custom} placeholder="0" keyboardType="number-pad"
              onChangeText={(v) => { const n = v.replace(/\D/g, ''); setCustom(n); if (n) choose(strategy, Number(n)); }} />

            <View style={s.result}>
              <Text style={s.muted}>Debt-free by</Text>
              <Text style={[s.resultBig, plan.months == null && { color: Corpus.danger }]}>{monthName(plan.months)}</Text>
              {plan.months != null && <Text style={s.small}>{span(plan.months)} from now, {formatINR(plan.interest)} of interest on the way.</Text>}
              {extra > 0 && base.months != null && plan.months != null && base.months > plan.months && (
                <Text style={[s.small, { color: Corpus.income, fontFamily: Font.display }]}>{span(base.months - plan.months)} sooner and {formatINR(base.interest - plan.interest)} less interest than paying only EMIs and minimums.</Text>
              )}
              {extra > 0 && base.months == null && plan.months != null && <Text style={[s.small, { color: Corpus.income, fontFamily: Font.display }]}>With minimums alone you would never finish. This extra gets you out.</Text>}
            </View>
            {plan.stuck.length > 0 && (
              <Text style={[s.small, { color: Corpus.danger }]}>{plan.stuck.join(', ')} {plan.stuck.length > 1 ? "don't" : "doesn't"} shrink at this pace: the payment only covers interest. Add some extra each month.</Text>
            )}

            {/* the order, as steps: when each one is gone */}
            <View style={{ gap: 0 }}>
              {plan.order.map((o, i) => {
                const d = list.find((x) => x.id === o.id)!;
                return (
                  <View key={o.id} style={s.stepRow}>
                    <View style={s.stepCol}>
                      <View style={[s.stepDot, i === 0 && { backgroundColor: Corpus.gold }]}><Text style={[s.stepNum, i === 0 && { color: Corpus.onGold }]}>{i + 1}</Text></View>
                      {i < plan.order.length - 1 && <View style={s.stepLine} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14, gap: 2 }}>
                      <Text style={s.name}>{d.name}</Text>
                      <Text style={[s.small, o.month == null && { color: Corpus.danger }]}>{formatINR(d.balance)}{d.rate != null ? ` at ${d.rate}%` : ''}. {o.month == null ? 'Not cleared at this pace' : `Gone by ${monthName(o.month)}`}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <Group title="What extra money buys you">
            {ladder.map(({ e, r }) => (
              <GroupRow key={e} title={e ? `${formatINR(e)} extra a month` : 'Only EMIs and minimums'} subtitle={r.months == null ? 'Never paid off' : `Free by ${monthName(r.months)}`}
                value={r.months == null ? '' : `${formatINR(r.interest)} interest`} valueColor={e === extra && !custom ? Corpus.text : undefined}
                right={e === extra && !custom ? <Ionicons name="checkmark-circle" size={18} color={Corpus.income} /> : undefined}
                onPress={() => { setCustom(''); choose(strategy, e); }} chevron={false} />
            ))}
          </Group>

          {/* 6. Every debt, costliest first */}
          <Group title="Your debts, costliest first">
            {list.map((d: DebtLine) => {
              const h = heat(d.rate);
              return (
                <GroupRow key={d.id} icon={KIND[d.kind].icon} color={d.kind === 'card' ? Chip.red : h.color}
                  title={d.name}
                  subtitle={`${d.rate != null ? `${d.rate}% a year, ${h.word.toLowerCase()}` : 'Rate not known'}${d.interestPerMonth ? `. ${formatINR(d.interestPerMonth)} a month in interest` : ''}${d.monthsLeft ? `. ${d.monthsLeft} EMIs left` : ''}`}
                  value={formatINR(d.balance)} onPress={() => router.push(d.link as Href)} />
              );
            })}
          </Group>
          {t.unknownRates > 0 && (
            <View style={[s.card, s.row]}>
              <Ionicons name="information-circle" size={18} color={Corpus.textMuted} />
              <Text style={[s.small, { flex: 1 }]}>{t.unknownRates} EMI{t.unknownRates > 1 ? 's have' : ' has'} no interest rate yet. Add the loan details from your loan statement to see its real cost.</Text>
            </View>
          )}
          <Text style={s.note}>
            Loans with a floating rate taken or renewed from 1 Jan 2026 can be prepaid with no charge (RBI rule), so extra payments on them cost nothing extra. Card rate assumed at about 42% a year. Interest a month is roughly balance × rate ÷ 12. A guide, not financial advice.
          </Text>
          {w.bills.some((b) => /emi|loan/i.test(b.name) && !b.loan) && (
            <View style={{ alignSelf: 'flex-start' }}><Button variant="secondary" size="sm" label="Add loan details" onPress={() => router.push('/bills' as Href)} /></View>
          )}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 8 },
  hero: { overflow: 'hidden', gap: 10 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.2, marginTop: -6, ...tabular },
  h: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  name: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  amount: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  muted: { fontSize: Type.body, color: Corpus.textMuted },
  line: { fontSize: Type.body, color: Corpus.text, lineHeight: 19, ...tabular },
  small: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17, ...tabular },
  strong: { fontFamily: Font.display, color: Corpus.text },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  note: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: Corpus.cardAlt },
  tick: { position: 'absolute', top: -3, width: 2, height: 16, borderRadius: 1, marginLeft: -1, backgroundColor: Corpus.textMuted },
  scale: { fontSize: Type.micro, color: Corpus.textMuted },
  strip: { flexDirection: 'row', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  ruled: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border, paddingLeft: 12 },
  statNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  ways: { backgroundColor: Corpus.bg, borderRadius: 16, paddingHorizontal: 14 },
  way: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  wayLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  tag: { backgroundColor: Corpus.incomeTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: Type.micro, fontFamily: Font.displayBold, color: Corpus.income },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, backgroundColor: Corpus.bg, borderRadius: 18, padding: 14, gap: 3 },
  tileOn: { backgroundColor: Corpus.gold },
  tileNum: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, marginTop: 6, ...tabular },
  result: { backgroundColor: Corpus.bg, borderRadius: 18, padding: 16, gap: 2, alignItems: 'flex-start' },
  resultBig: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Corpus.income, letterSpacing: -0.5, ...tabular },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepCol: { alignItems: 'center', width: 26 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: Type.small, fontFamily: Font.displayBold, color: Corpus.text },
  stepLine: { flex: 1, width: 2, backgroundColor: Corpus.border, marginVertical: 2 },
});

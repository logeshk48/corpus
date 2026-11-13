import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useWealth } from '@/hooks/useWealth';
import { compactINR, formatINR } from '@/utils/format';
import { liquidFundReturn } from '@/utils/market';
import { upcomingBills } from '@/utils/moneyHealth';
import { idleCash, savingsTrend, SAVINGS_ACCOUNT_RATE } from '@/utils/wealthTrend';
import { project, real } from '@/utils/projection';
import { projectionInputs } from '@/utils/projectionInputs';
import { monthlyFlows, recentAverage, type Pillar, type PillarId } from '@/utils/wealthScore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './WealthScreen.styles';
import WhatIfCard from './WhatIfCard';
import { useSettings } from '@/hooks/useSettings';
import { saveSettings } from '@/services/settings';

const TONE = { good: Corpus.income, ok: Corpus.gold, weak: Corpus.warning };
const META: Record<PillarId, { icon: keyof typeof Ionicons.glyphMap; go: string; goLabel: string; full: string }> = {
  saving: { icon: 'wallet-outline', go: '/analytics', goLabel: 'See spending', full: '30% of income saved' },
  emergency: { icon: 'shield-checkmark-outline', go: '/accounts', goLabel: 'Update balances', full: '6 months of spending + EMIs in bank, FD or debt funds' },
  debt: { icon: 'trending-down-outline', go: '/debts', goLabel: 'See all debts', full: 'EMIs + interest under 10% of income, no big card balance' },
  investing: { icon: 'trending-up-outline', go: '/invest', goLabel: 'Open Invest', full: '20% of income invested monthly, SIPs never skipped, a mix of equity and debt' },
  wealth: { icon: 'diamond-outline', go: '/networth', goLabel: 'See net worth', full: 'Net worth = 10 years of spending' },
};
const barColor = (p: Pillar) => (p.score >= 14 ? Corpus.income : p.score >= 8 ? Corpus.gold : Corpus.warning);

export default function WealthScreen() {
  const router = useRouter();
  const w = useWealth();
  const { score: s, loading } = w;
  // remember this month's score (shows the change next month)
  const { settings } = useSettings();
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const log = settings.scoreLog ?? {};
  const lastMonth = Object.keys(log).filter((k) => k < monthKey).sort().pop();
  const delta = lastMonth != null ? s.score - log[lastMonth] : null;
  useEffect(() => {
    if (!loading && s.known >= 3 && log[monthKey] !== s.score) saveSettings({ scoreLog: { ...log, [monthKey]: s.score } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, s.score, s.known]);
  const [how, setHow] = useState(false);

  // Savings rate, last 12 months
  const trend = useMemo(() => savingsTrend(monthlyFlows(w.tx, w.investments, 12)), [w.tx, w.investments]);
  // Idle cash: bank money beyond ~2 months of needs
  const [liquidRate, setLiquidRate] = useState<number | null>(null);
  useEffect(() => {
    liquidFundReturn().then(setLiquidRate);
  }, []);
  const avg = recentAverage(w.inputs.flows);
  const monthlyNeed = (avg?.spend ?? 0) + w.inputs.monthlyEmi;
  const cash = w.items.filter((i) => i.group === 'cash').reduce((a, i) => a + Math.max(0, i.value), 0);
  const idle = idleCash({ cash, monthlyNeed, billsDue30: upcomingBills(w.bills).reduce((a, b) => a + b.amount, 0), cardDues: w.inputs.cardDues, liquidRate: liquidRate ?? 6.4 });
  // Where you're heading (today's habits)
  const [todayMoney, setTodayMoney] = useState(true);
  const pin = useMemo(() => projectionInputs({ items: w.items, investments: w.investments, ious: w.ious, bills: w.bills, score: w.inputs }), [w.items, w.investments, w.ious, w.bills, w.inputs]);
  const pts = useMemo(() => project(pin, 25), [pin]);
  const shown = (v: number, m: number) => (todayMoney ? real(v, m) : v);
  const yearly = pts.filter((p) => p.month % 12 === 0 && p.month <= 240);
  const peak = Math.max(1, ...yearly.map((p) => shown(p.netWorth, p.month)));
  const fiTarget = monthlyNeed * 12 * 25;
  const atMonth = (m: number | null) => (m == null ? null : new Date(new Date().getFullYear(), new Date().getMonth() + m, 1));
  // milestones are in today's money when the toggle is on (₹1 Cr of today's buying power)
  const reach = (target: number) => {
    const hit = pts.find((p) => (todayMoney ? real(p.netWorth, p.month) : p.netWorth) >= target);
    return hit && hit.month > 0 ? atMonth(hit.month) : null;
  };
  const crore = reach(1e7);
  const fi = fiTarget > 0 ? reach(fiTarget) : null;
  const pct = (r: number | null) => (r == null ? '—' : `${r < 0 ? '−' : ''}${Math.abs(Math.round(r * 100))}%`);
  const maxRate = Math.max(0.4, ...trend.months.map((m) => m.rate ?? 0));
  const c = TONE[s.tone];
  const unknown = s.pillars.filter((p) => !p.known);
  const ordered = [...s.pillars].sort((a, b) => Number(b.known) - Number(a.known) || a.score - b.score); // weakest first

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Wealth score" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={[styles.ring, { borderColor: c }]}>
                <Text style={[styles.ringNum, { color: c }]}>{s.known < 2 ? '—' : s.score}</Text>
                <Text style={styles.ringOf}>out of 100</Text>
              </View>
              <Text style={[styles.grade, { color: c }]}>{s.grade}</Text>
              {delta != null && delta !== 0 && (
                <Text style={[styles.sub, { color: delta > 0 ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} since {new Date(`${lastMonth}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' })}
                </Text>
              )}
              <Text style={styles.sub}>
                {s.known < 2
                  ? 'Log your income and a few weeks of spending, and add your bank balance — the score needs at least two parts to mean anything.'
                  : s.score >= 80
                  ? 'Your money is working hard. Keep the habits that got you here.'
                  : s.score >= 65
                    ? 'Solid foundations. A couple of fixes would make you very secure.'
                    : s.score >= 50
                      ? 'You’re building. Fix the weakest part first — it moves the score most.'
                      : 'Some basics need attention. Start with the one fix below.'}
                {unknown.length ? ` Based on ${s.known} of 5 parts.` : ''}
              </Text>
            </View>

            {s.topFix && (
              <Pressable style={styles.fixCard} onPress={() => router.push(META[s.topFix!.id].go as Href)}>
                <Text style={styles.fixLabel}>BIGGEST FIX FIRST · +{Math.round((s.topFix.gain / (s.known * 20)) * 100)} POINTS</Text>
                <Text style={styles.fixText}>{s.topFix.fix}</Text>
                <Text style={styles.why}>
                  {s.topFix.label}: {s.topFix.value}. {META[s.topFix.id].goLabel} →
                </Text>
              </Pressable>
            )}

            {trend.count > 0 && (
              <View style={styles.card}>
                <Text style={styles.name}>Savings rate · last 12 months</Text>
                <View style={styles.chart}>
                  {trend.months.map((m, i) => {
                    const r = m.rate;
                    const now = i === trend.months.length - 1;
                    const color = r == null ? Corpus.cardAlt : r < 0 ? Corpus.danger : r >= 0.2 ? Corpus.income : Corpus.gold;
                    return (
                      <View key={m.month} style={styles.col}>
                        <Text style={styles.colPct}>{r == null ? '' : pct(r)}</Text>
                        <View style={[styles.colBar, { height: `${r == null ? 3 : Math.max(4, (Math.max(0, r) / maxRate) * 75)}%`, backgroundColor: color, opacity: now ? 0.45 : 1 }]} />
                        <Text style={styles.colLabel}>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'narrow' })}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.statRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>AVERAGE</Text>
                    <Text style={styles.statValue}>{pct(trend.avg)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>LAST 3 MONTHS</Text>
                    <Text style={[styles.statValue, trend.change != null && { color: trend.change >= 0 ? Corpus.income : Corpus.danger }]}>
                      {pct(trend.recent)}
                      {trend.change != null ? ` ${trend.change >= 0 ? '▲' : '▼'}` : ''}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>SAVED</Text>
                    <Text style={styles.statValue}>{formatINR(Math.round(trend.savedTotal))}</Text>
                  </View>
                </View>
                <Text style={styles.why}>
                  {trend.change != null
                    ? trend.change >= 0.02
                      ? `Improving: up ${Math.round(trend.change * 100)} points on the 3 months before.`
                      : trend.change <= -0.02
                        ? `Slipping: down ${Math.round(-trend.change * 100)} points on the 3 months before.`
                        : 'Steady over the last 6 months.'
                    : 'Keep logging — the trend shows after a few months.'}
                  {trend.best ? ` Best: ${new Date(`${trend.best.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} at ${pct(trend.best.rate)}.` : ''}
                  {trend.negative ? ` ${trend.negative} month${trend.negative > 1 ? 's' : ''} you spent more than you earned.` : ''}
                </Text>
                <Text style={styles.note}>Faded bar = this month so far. Only months with income are counted.</Text>
              </View>
            )}

            {idle.show && (
              <Pressable style={styles.card} onPress={() => router.push('/invest' as Href)}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name="hourglass-outline" size={17} color={Corpus.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{formatINR(idle.idle)} is sitting idle</Text>
                    <Text style={styles.why}>In your bank at ~{SAVINGS_ACCOUNT_RATE}% beyond what you need there</Text>
                  </View>
                </View>
                <Text style={styles.value}>
                  Moving it to a liquid fund (~{(liquidRate ?? 6.4).toFixed(1)}% over the last year{liquidRate == null ? ', approx.' : ''}) would earn about{' '}
                  <Text style={{ color: Corpus.income, fontWeight: '600' }}>{formatINR(idle.extraPerYear)} more a year</Text>.
                </Text>
                <Text style={styles.why}>
                  Keep {formatINR(idle.keep)} in the bank (2 months of spending + EMIs, plus bills and card dues in the next 30 days). Liquid funds pay back in 1 working day and have no lock-in; gains are taxed at your slab, like FD interest.
                </Text>
                <Text style={styles.note}>Not advice to buy a specific fund. Your bank’s auto-sweep FD is a simpler option.</Text>
              </Pressable>
            )}

            {(pin.monthlySave > 0 || w.totals.total > 0) && (
              <View style={styles.card}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Text style={styles.name}>Where you’re heading</Text>
                  <Pressable onPress={() => setTodayMoney(!todayMoney)} hitSlop={8}>
                    <Text style={[styles.fix, { fontWeight: '600' }]}>{todayMoney ? 'In today’s money ⇄' : 'Future rupees ⇄'}</Text>
                  </Pressable>
                </View>
                <View style={[styles.chart, { height: 90, gap: 2 }]}>
                  {yearly.map((p) => {
                    const v = shown(p.netWorth, p.month);
                    return <View key={p.month} style={[styles.colBar, { flex: 1, height: `${Math.max(2, (Math.max(0, v) / peak) * 100)}%`, backgroundColor: p.month === 0 ? Corpus.textMuted : [60, 120, 240].includes(p.month) ? Corpus.gold : Corpus.goldLine }]} />;
                  })}
                </View>
                <View style={styles.statRow}>
                  {[0, 60, 120, 240].map((m) => {
                    const p = pts.find((x) => x.month === m)!;
                    return (
                      <View key={m} style={styles.stat}>
                        <Text style={styles.statLabel}>{m === 0 ? 'NOW' : `${m / 12} YEARS`}</Text>
                        <Text style={styles.statValue}>{compactINR(shown(p.netWorth, m))}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.why}>
                  {crore ? `₹1 Cr${todayMoney ? ' (today’s value)' : ''} around ${crore.getFullYear()}. ` : 'Not reaching ₹1 Cr within 25 years at this pace. '}
                  {fiTarget > 0
                    ? fi
                      ? `Financial freedom — 25× your yearly spending (${compactINR(fiTarget)}${todayMoney ? ' in today’s money' : ''}) — around ${fi.getFullYear()}.`
                      : `Financial freedom (25× yearly spending = ${compactINR(fiTarget)}) is more than 25 years away at this pace.`
                    : ''}
                </Text>
                <Text style={styles.note}>
                  If today’s habits continue: you save {formatINR(Math.round(pin.monthlySave))} a month, {formatINR(pin.monthlyInvest)} of it in SIPs (the rest stays as cash at ~2.7%). Investments grow at long-run averages for what you hold (equity 12%, debt 7%, gold 8%, PF/PPF 8%); homes +5%, vehicles −12% a year; loans end on schedule and their EMI becomes savings.{todayMoney ? ' “Today’s money” removes 6% inflation a year.' : ''} Markets don’t move in straight lines — treat this as direction, not a promise.
                </Text>
              </View>
            )}

            {(pin.monthlySave > 0 || w.totals.total > 0) && <WhatIfCard base={pin} idle={idle.show ? idle.idle : 0} />}

            <SectionLabel right="Weakest first">THE 5 PARTS</SectionLabel>
            {ordered.map((p) => (
              <Pressable key={p.id} style={styles.card} onPress={() => router.push(META[p.id].go as Href)}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name={META[p.id].icon} size={17} color={p.known ? barColor(p) : Corpus.textFaint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.label}</Text>
                    <Text style={styles.value}>{p.value}</Text>
                  </View>
                  <Text style={[styles.pts, { color: p.known ? barColor(p) : Corpus.textFaint }]}>{p.known ? `${Math.round(p.score)}/20` : '—'}</Text>
                </View>
                {p.known && (
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${(p.score / 20) * 100}%`, backgroundColor: barColor(p) }]} />
                  </View>
                )}
                <Text style={styles.why}>{p.why}</Text>
                {p.fix && <Text style={styles.fix}>→ {p.fix}</Text>}
                {!p.fix && p.known && <Text style={[styles.fix, { color: Corpus.income }]}>✓ Full marks</Text>}
              </Pressable>
            ))}

            <Pressable onPress={() => setHow(!how)}>
              <SectionLabel right={how ? 'Hide' : 'Show'}>HOW IT’S CALCULATED</SectionLabel>
            </Pressable>
            {how && (
              <View style={styles.card}>
                <Text style={styles.why}>Five parts, 20 points each. Full marks for:</Text>
                {s.pillars.map((p) => (
                  <Text key={p.id} style={styles.why}>
                    • <Text style={{ color: Corpus.text }}>{p.label}</Text>: {META[p.id].full}
                  </Text>
                ))}
                <Text style={styles.note}>
                  Uses your last 3 complete months of income and spending, your balances, debts and investments. SIPs and money moved to jars count as saved, not spent. Stocks don’t count as emergency money (they can be down 30% when you need them). Parts without enough data are left out and the score is scaled to 100. A guide, not financial advice.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import AreaTrend from '@/components/charts/AreaTrend';
import Donut from '@/components/charts/Donut';
import Aura from '@/components/fx/Aura';
import Shine from '@/components/fx/Shine';
import { TAB_BAR_SPACE } from '@/components/GlassTabBar';
import { IconChip, PillTabs, Segmented, Tap } from '@/components/ui';
import { CategoryChip, Chip, Corpus, Font, Pastel, tabular, Type } from '@/constants/theme';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { useVaults } from '@/hooks/useVaults';
import TransactionRow from '@/screens/home/components/TransactionRow';
import {
  byCategory, cashFlow, categoryTotals, change, dailyAverage, dailySpending, incomeBySource, insights,
  monthLabel, monthlyTrend, monthTotals, shiftMonth, topExpenses, ym,
} from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarHeatmap from './components/CalendarHeatmap';
import CashFlowBar from './components/CashFlowBar';
import CategoryBars from './components/CategoryBars';
import DailyChart from './components/DailyChart';
import IncomeSources from './components/IncomeSources';
import { Movers, Pace, Rates, SmallDots, Weekdays } from './components/InsightWidgets';
import { categoryMovers, monthPace, smallSpends, weekdayPattern } from '@/utils/insightsMore';

const MONTHS_BACK = 5; // the last 6 months
const short = (k: string) => monthLabel(k, 'short').split(' ')[0];

function Card({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title}</Text>
        {!!meta && <Text style={s.meta}>{meta}</Text>}
      </View>
      {children}
    </View>
  );
}

// Insights: your month as a short story. The headline and where it went first, then what stands out,
// then the detail. Each card says its takeaway in words; the chart backs it up.
export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, loading } = useTransactions('last12Months');
  const { entries: jarEntries } = useVaults();
  const { streams } = useIncomeStreams();
  const { settings } = useSettings();
  const [dailyView, setDailyView] = useState<'bars' | 'calendar'>('bars');
  type Tab = 'overview' | 'spending' | 'income' | 'trends';
  const [tab, setTab] = useState<Tab>('overview');
  const pills = useRef<ScrollView>(null);
  const current = ym(new Date());
  const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : current);
  useEffect(() => { if (params.month && /^\d{4}-\d{2}$/.test(params.month)) setMonth(params.month); }, [params.month]);

  const isCurrent = month === current;
  const totals = monthTotals(transactions, month);
  const prevKey = shiftMonth(month, -1);
  const today = new Date().getDate();
  // While a month is in progress, compare with the same days of last month
  const prev = monthTotals(transactions, prevKey, isCurrent ? today : undefined);
  const vs = isCurrent ? `${short(prevKey)} 1–${today}` : short(prevKey);
  const categories = byCategory(transactions, month);
  const days = dailySpending(transactions, month);
  const avg = dailyAverage(days);
  const trend = monthlyTrend(transactions, current, MONTHS_BACK + 1);
  const notes = insights(transactions, month);
  const prevCategories = categoryTotals(transactions, prevKey, isCurrent ? today : undefined);
  const flow = cashFlow(transactions, jarEntries, month);
  const biggest = topExpenses(transactions, month, 5);
  const sources = incomeBySource(transactions, month, streams);
  const empty = totals.income === 0 && totals.spent === 0;
  const spentV = useTween(loading ? 0 : totals.spent);
  const d = change(totals.spent, prev.spent);

  // Donut: the top 4 categories and the rest together (a donut stays readable up to 5 slices)
  const top = categories.slice(0, 4);
  const rest = categories.slice(4).reduce((a, c) => a + c.amount, 0);
  const slices = [...top.map((c) => ({ id: c.id, value: c.amount, color: CategoryChip[c.id] ?? Chip.gray, label: c.label, share: c.share })),
    ...(rest > 0 ? [{ id: 'rest', value: rest, color: Chip.gray, label: 'Everything else', share: totals.spent ? rest / totals.spent : 0 }] : [])];
  const pct = (sh: number) => `${Math.round(sh * (sh <= 1 ? 100 : 1))}%`;

  const pace = monthPace(transactions, month, settings.monthlyBudget);
  const week = weekdayPattern(transactions);
  const small = smallSpends(transactions, month);
  const movers = categoryMovers(transactions, month);
  const rates = trend.map((t) => ({ key: t.key, label: short(t.key), rate: t.income > 0 ? Math.round(((t.income - t.spent) / t.income) * 100) : null, on: t.key === month }));
  const kept = rates.filter((r) => r.rate != null);
  const avgRate = kept.length ? Math.round(kept.reduce((a, r) => a + (r.rate ?? 0), 0) / kept.length) : null;

  const sections: ReactNode[] = [];
  const at: Record<string, Tab> = { pace: 'overview', notes: 'overview', flow: 'overview', cats: 'spending', daily: 'spending', week: 'spending', small: 'spending', big: 'spending', src: 'income', rates: 'income', trend: 'trends', movers: 'trends' };
  if (!empty && totals.spent > 0) sections.push(
    <Card key="pace" title="Where the month is heading" meta={pace.isCurrent ? `Day ${pace.day} of ${pace.days}` : undefined}><Pace p={pace} daily={days.map((x) => x.amount)} /></Card>,
  );
  if (!empty && notes.length > 0) sections.push(
    <View key="notes" style={{ gap: 10 }}>
      <Text style={[s.cardTitle, { paddingHorizontal: 4 }]}>What stands out</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={262} decelerationRate="fast" contentContainerStyle={{ gap: 10, paddingRight: 16 }}>
        {notes.map((n, i) => {
          const t = [Pastel.butter, Pastel.rose, Pastel.mint, Pastel.lilac, Pastel.peach][i % 5];
          return (
            <View key={n} style={[s.note, { backgroundColor: t.bg }]}>
              <View style={[s.noteIcon, { backgroundColor: t.icon }]}><Ionicons name={(['bulb', 'flash', 'trending-up', 'eye', 'star'][i % 5]) as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.sheen} /></View>
              <Text style={[s.noteText, { color: t.fg }]}>{n}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>,
  );
  if (!empty && categories.length > 0) sections.push(
    <Card key="cats" title="Where your money went" meta="Tap a category">
      <CategoryBars data={categories} previous={prevCategories} previousLabel={vs} budgets={settings.categoryBudgets}
        onPress={(id) => router.push(`/category/${id}?month=${month}` as Href)} />
    </Card>,
  );
  if (!empty && totals.spent > 0) sections.push(
    <Card key="daily" title="Day by day" meta={`About ${formatINR(Math.round(avg))} a day`}>
      <Segmented options={[{ value: 'bars', label: 'Bars' }, { value: 'calendar', label: 'Calendar' }] as const} value={dailyView} onChange={setDailyView} />
      <Animated.View key={dailyView} entering={FadeIn.duration(220)}>
        {dailyView === 'bars' ? <DailyChart points={days} average={avg} monthKey={month} /> : <CalendarHeatmap points={days} monthKey={month} />}
      </Animated.View>
    </Card>,
  );
  if (week.avg.some((v) => v > 0)) sections.push(
    <Card key="week" title="Your week" meta="Last 3 months"><Weekdays w={week} /></Card>,
  );
  if (!empty && small.count >= 5) sections.push(
    <Card key="small" title="Small spends add up">
      <SmallDots count={small.count} total={small.total} under={small.under} share={totals.spent ? Math.round((small.total / totals.spent) * 100) : 0} />
    </Card>,
  );
  if (!empty && flow.income > 0) sections.push(
    <Card key="flow" title="Where your income went" meta={`${formatINR(flow.income)} in`}><CashFlowBar flow={flow} /></Card>,
  );
  if (!empty && biggest.length > 0) sections.push(
    <Card key="big" title="Biggest spends" meta={totals.spent > 0 ? `${Math.round((biggest.reduce((a, t) => a + t.amount, 0) / totals.spent) * 100)}% of the month` : undefined}>
      {biggest.map((t) => <TransactionRow key={t.id} tx={t} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: t.id } })} />)}
    </Card>,
  );
  if (!empty && sources.length > 0) sections.push(
    <Card key="src" title="Where your income came from" meta={formatINR(totals.income)}><IncomeSources data={sources} /></Card>,
  );
  if (kept.length > 0) sections.push(
    <Card key="rates" title="How much you kept" meta={avgRate != null ? `Usually ${avgRate}%` : undefined}>
      <Rates months={rates} />
      <Text style={s.meta}>Share of what came in that you did not spend. 20% or more is a healthy month.</Text>
    </Card>,
  );
  const sel = trend.find((t) => t.key === month);
  sections.push(
    <Card key="trend" title="Last 6 months" meta={sel ? `${short(month)}: ${formatINR(sel.income)} in, ${formatINR(sel.spent)} spent` : undefined}>
      <View style={s.legend}>
        <View style={[s.swatch, { backgroundColor: Corpus.income }]} /><Text style={s.meta}>Came in</Text>
        <View style={[s.swatch, { backgroundColor: Chip.orange, marginLeft: 12 }]} /><Text style={s.meta}>Spent</Text>
      </View>
      <AreaTrend data={trend.map((t) => ({ key: t.key, label: short(t.key), a: t.income, b: t.spent }))} selected={month} onSelect={setMonth} />
    </Card>,
  );
  if (!empty) sections.push(
    <Card key="movers" title="Against your usual" meta={isCurrent ? `Days 1 to ${today}` : 'Whole month'}>
      <Movers m={movers} onOpen={(id) => router.push(`/category/${id}?month=${month}` as Href)} />
      <Text style={s.meta}>Compared with the average of the 3 months before, over the same days.</Text>
    </Card>,
  );
  const shown = Children.toArray(sections).filter(isValidElement).filter((el) => at[String(el.key).replace(/^\.\$/, '')] === tab);

  return (
    <View style={s.root}>
      <View style={s.aura} pointerEvents="none"><Aura color={Chip.blue} second={Chip.indigo} /></View>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + 20 }]} showsVerticalScrollIndicator={false} stickyHeaderIndices={empty ? undefined : [3]}>
          <View style={s.head}>
            <Text style={s.heading} accessibilityRole="header">Insights</Text>
            <Tap onPress={() => router.push('/reports' as Href)} style={s.glassBtn} accessibilityRole="button">
              <Ionicons name="document-text-outline" size={16} color={Corpus.text} />
              <Text style={s.glassText}>Year report</Text>
            </Tap>
          </View>

          {/* months as pills: tap to jump */}
          <ScrollView ref={pills} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} onContentSizeChange={() => pills.current?.scrollToEnd({ animated: false })}>
            {trend.map((t) => {
              const on = t.key === month;
              return (
                <Tap key={t.key} onPress={() => setMonth(t.key)} style={[s.mPill, on && s.mPillOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <Text style={[s.mText, on && { color: Corpus.onGold }]}>{t.key === current ? 'This month' : short(t.key)}</Text>
                </Tap>
              );
            })}
          </ScrollView>

          {/* the headline: how much, the change, and where it went */}
          <Animated.View key={month} entering={FadeInDown.duration(320)} style={[s.card, s.hero]}>
            <Shine />
            {loading ? <View style={{ height: 160 }} /> : empty ? (
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
                <IconChip icon="bar-chart" color={Chip.blue} size={48} />
                <Text style={s.cardTitle}>Nothing logged in {monthLabel(month, 'short')}</Text>
                <Text style={[s.meta, { textAlign: 'center' }]}>Add what you spend and what comes in, and your month shows up here.</Text>
              </View>
            ) : (
              <>
                <View style={s.heroRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.meta}>{isCurrent ? 'Spent so far' : `Spent in ${monthLabel(month, 'short')}`}</Text>
                    <Text style={s.big} adjustsFontSizeToFit numberOfLines={1}>{formatINR(Math.round(spentV))}</Text>
                    {d !== null && (
                      <View style={[s.delta, { backgroundColor: d > 0 ? Corpus.dangerTint : Corpus.incomeTint }]}>
                        <Ionicons name={d > 0 ? 'arrow-up' : d < 0 ? 'arrow-down' : 'remove'} size={13} color={d > 0 ? Corpus.danger : Corpus.income} />
                        <Text style={[s.deltaText, { color: d > 0 ? Corpus.danger : Corpus.income }]}>{d === 0 ? `Same as ${vs}` : `${Math.abs(d)}% ${d > 0 ? 'more' : 'less'} than ${vs}`}</Text>
                      </View>
                    )}
                  </View>
                  {slices.length > 0 && (
                    <Donut data={slices} size={118} thickness={16} track={Corpus.cardAlt}>
                      <Text style={s.donutNum}>{categories.length}</Text>
                      <Text style={s.donutLabel}>{categories.length === 1 ? 'category' : 'categories'}</Text>
                    </Donut>
                  )}
                </View>
                {slices.length > 0 && (
                  <View style={s.legendList}>
                    {slices.map((sl) => (
                      <View key={sl.id} style={s.legendRow}>
                        <View style={[s.dot, { backgroundColor: sl.color }]} />
                        <Text style={[s.legendLabel, { flex: 1 }]} numberOfLines={1}>{sl.label}</Text>
                        <Text style={s.meta}>{pct(sl.share)}</Text>
                        <Text style={s.legendAmt}>{formatINR(Math.round(sl.value))}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={s.strip}>
                  <View style={s.stat}><Text style={s.meta}>Came in</Text><Text style={s.statNum}>{formatINR(totals.income)}</Text></View>
                  <View style={[s.stat, s.ruled]}>
                    <Text style={s.meta}>Kept</Text>
                    <Text style={[s.statNum, totals.saved < 0 && { color: Corpus.danger }]}>{totals.saved < 0 ? '−' : ''}{formatINR(Math.abs(totals.saved))}</Text>
                  </View>
                  <View style={[s.stat, s.ruled]}>
                    <Text style={s.meta}>Of income</Text>
                    <Text style={[s.statNum, totals.savingsRate !== null && totals.savingsRate >= 20 && { color: Corpus.income }]}>{totals.savingsRate !== null ? `${totals.savingsRate}%` : 'None'}</Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>

          {!empty && (
            <View style={s.tabsWrap}>
              <PillTabs tabs={[{ value: 'overview', label: 'Overview', icon: 'sparkles' }, { value: 'spending', label: 'Spending', icon: 'cart' }, { value: 'income', label: 'Income', icon: 'arrow-down-circle' }, { value: 'trends', label: 'Trends', icon: 'analytics' }]} value={tab} onChange={setTab} />
            </View>
          )}

          {(empty ? Children.toArray(sections).filter(isValidElement).filter((el) => String(el.key).includes('trend')) : shown).map((el, i) => (
            <Animated.View key={`${month}-${tab}-${el.key}`} entering={FadeInDown.delay(60 + i * 60).duration(300)}>{el}</Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 440 },
  content: { paddingHorizontal: 16, paddingTop: 6, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: Type.h1 + 4, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.6 },
  glassBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge },
  glassText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  mPill: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: Corpus.card, justifyContent: 'center' },
  mPillOn: { backgroundColor: Corpus.gold },
  mText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 18, gap: 12 },
  hero: { overflow: 'hidden', gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1.4, ...tabular },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  deltaText: { fontSize: Type.small, fontFamily: Font.display, ...tabular },
  donutNum: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  donutLabel: { fontSize: Type.micro, color: Corpus.textMuted },
  legendList: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: Type.body, color: Corpus.text },
  legendAmt: { fontSize: Type.body, fontFamily: Font.displayBold, color: Corpus.text, minWidth: 74, textAlign: 'right', ...tabular },
  strip: { flexDirection: 'row', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  stat: { flex: 1, gap: 2 },
  ruled: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border, paddingLeft: 12 },
  statNum: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.2 },
  meta: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  note: { width: 252, minHeight: 120, backgroundColor: Corpus.card, borderRadius: 22, padding: 16, gap: 10 },
  noteIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  noteText: { fontSize: Type.bodyLg, color: Corpus.text, lineHeight: 20, fontFamily: Font.display },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 4, borderRadius: 2 },
  tabsWrap: { backgroundColor: Corpus.bg, paddingVertical: 6, marginVertical: -6 },
});

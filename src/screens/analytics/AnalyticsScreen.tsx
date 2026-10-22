import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useSettings } from '@/hooks/useSettings';
import { useVaults } from '@/hooks/useVaults';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { useRouter, type Href } from 'expo-router';
import {
  byCategory,
  cashFlow,
  categoryTotals,
  change,
  dailyAverage,
  dailySpending,
  incomeBySource,
  insights,
  monthLabel,
  monthlyTrend,
  monthTotals,
  shiftMonth,
  topExpenses,
  ym,
} from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarHeatmap from './components/CalendarHeatmap';
import CashFlowBar from './components/CashFlowBar';
import CategoryBars from './components/CategoryBars';
import IncomeSources from './components/IncomeSources';
import DailyChart from './components/DailyChart';
import StatTile from './components/StatTile';
import TrendChart from './components/TrendChart';
import { styles } from './AnalyticsScreen.styles';

const MONTHS_BACK = 5; // the stepper and trend cover the last 6 months

export default function AnalyticsScreen() {
  const router = useRouter();
  const { transactions, loading } = useTransactions('last12Months');
  const { entries: jarEntries } = useVaults();
  const { streams } = useIncomeStreams();
  const { settings } = useSettings();
  const [dailyView, setDailyView] = useState<'bars' | 'calendar'>('bars');
  const current = ym(new Date());
  const [month, setMonth] = useState(current);
  const oldest = shiftMonth(current, -MONTHS_BACK);

  const isCurrent = month === current;
  const totals = monthTotals(transactions, month);
  const prevKey = shiftMonth(month, -1);
  // While a month is in progress, compare with the same days of last month
  const today = new Date().getDate();
  const prev = monthTotals(transactions, prevKey, isCurrent ? today : undefined);
  const prevShort = monthLabel(prevKey, 'short');
  const categories = byCategory(transactions, month);
  const days = dailySpending(transactions, month);
  const avg = dailyAverage(days);
  const trend = monthlyTrend(transactions, current, MONTHS_BACK + 1);
  const notes = insights(transactions, month);
  const prevCategories = categoryTotals(transactions, prevKey, isCurrent ? today : undefined);
  const prevLabel = isCurrent ? `${prevShort} 1–${today}` : prevShort;
  const flow = cashFlow(transactions, jarEntries, month);
  const biggest = topExpenses(transactions, month, 5);
  const sources = incomeBySource(transactions, month, streams);

  const delta = (now: number, before: number) => {
    const c = change(now, before);
    if (c === null) return null;
    const vs = isCurrent ? `${prevShort} 1–${today}` : prevShort;
    if (c === 0) return `Same as ${vs}`;
    return `${c > 0 ? '▲' : '▼'} ${Math.abs(c)}% vs ${vs}`;
  };
  const empty = totals.income === 0 && totals.spent === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Analytics</Text>

        {/* Month filter */}
        <View style={styles.stepper}>
          <Pressable
            style={styles.arrow}
            onPress={() => setMonth(shiftMonth(month, -1))}
            disabled={month <= oldest}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={month <= oldest ? Corpus.textFaint : Corpus.text} />
          </Pressable>
          <Text style={styles.stepperText}>{monthLabel(month)}</Text>
          <Pressable
            style={styles.arrow}
            onPress={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrent}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={18} color={isCurrent ? Corpus.textFaint : Corpus.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : (
          <>
            {/* Headline numbers */}
            <View style={styles.tiles}>
              <StatTile label={isCurrent ? 'Spent so far' : 'Spent'} value={formatINR(totals.spent)} delta={delta(totals.spent, prev.spent)} />
              <StatTile label="Earned" value={formatINR(totals.income)} delta={delta(totals.income, prev.income)} />
              <StatTile
                label="Saved"
                value={`${totals.saved < 0 ? '−' : ''}${formatINR(Math.abs(totals.saved))}`}
                delta={totals.saved < 0 ? 'Spent more than earned' : null}
              />
              <StatTile
                label="Savings rate"
                value={totals.savingsRate !== null ? `${totals.savingsRate}%` : '—'}
                delta={totals.savingsRate !== null ? 'Guideline: 20%' : 'No income this month'}
              />
            </View>

            {empty ? (
              <View style={styles.card}>
                <View style={styles.empty}>
                  <Ionicons name="bar-chart-outline" size={30} color={Corpus.textFaint} />
                  <Text style={styles.emptyTitle}>Nothing recorded in {monthLabel(month, 'short')}</Text>
                  <Text style={styles.emptyText}>Add expenses and income from the gold + tab to see your money story.</Text>
                </View>
              </View>
            ) : (
              <>
                {notes.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>What stands out</Text>
                    {notes.map((n) => (
                      <View key={n} style={styles.insight}>
                        <Ionicons name="sparkles" size={14} color={Corpus.gold} style={{ marginTop: 2 }} />
                        <Text style={styles.insightText}>{n}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {flow.income > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Where your income went</Text>
                      <Text style={styles.cardMeta}>{formatINR(flow.income)} in</Text>
                    </View>
                    <CashFlowBar flow={flow} />
                  </View>
                )}

                {categories.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Where your money went</Text>
                      <Text style={styles.cardMeta}>Tap a category</Text>
                    </View>
                    <CategoryBars
                      data={categories}
                      previous={prevCategories}
                      previousLabel={prevLabel}
                      budgets={settings.categoryBudgets}
                      onPress={(id) => router.push(`/category/${id}?month=${month}` as Href)}
                    />
                  </View>
                )}

                {totals.spent > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Daily spending</Text>
                      <View style={styles.segment}>
                        {(['bars', 'calendar'] as const).map((v) => (
                          <Pressable
                            key={v}
                            onPress={() => setDailyView(v)}
                            style={[styles.segmentItem, dailyView === v && styles.segmentActive]}
                          >
                            <Ionicons
                              name={v === 'bars' ? 'bar-chart-outline' : 'calendar-outline'}
                              size={14}
                              color={dailyView === v ? Corpus.gold : Corpus.textMuted}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    {dailyView === 'bars' ? (
                      <DailyChart points={days} average={avg} monthKey={month} />
                    ) : (
                      <CalendarHeatmap points={days} monthKey={month} />
                    )}
                  </View>
                )}

                {biggest.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Biggest expenses</Text>
                      <Text style={styles.cardMeta}>
                        {totals.spent > 0
                          ? `${Math.round((biggest.reduce((s, t) => s + t.amount, 0) / totals.spent) * 100)}% of spending`
                          : ''}
                      </Text>
                    </View>
                    {biggest.map((t) => (
                      <TransactionRow
                        key={t.id}
                        tx={t}
                        onPress={() => router.push({ pathname: '/edit/[id]', params: { id: t.id } })}
                      />
                    ))}
                  </View>
                )}

                {sources.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Where your income came from</Text>
                      <Text style={styles.cardMeta}>{formatINR(totals.income)}</Text>
                    </View>
                    <IncomeSources data={sources} />
                  </View>
                )}
              </>
            )}

            {/* 6-month trend — always shown, tap a month to jump to it */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Last 6 months</Text>
                <Text style={styles.cardMeta}>Tap a month</Text>
              </View>
              <TrendChart data={trend} selectedKey={month} onSelectMonth={setMonth} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

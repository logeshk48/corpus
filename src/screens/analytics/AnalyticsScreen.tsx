import { Corpus } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import {
  byCategory,
  change,
  dailyAverage,
  dailySpending,
  insights,
  monthLabel,
  monthlyTrend,
  monthTotals,
  shiftMonth,
  ym,
} from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CategoryBars from './components/CategoryBars';
import DailyChart from './components/DailyChart';
import StatTile from './components/StatTile';
import TrendChart from './components/TrendChart';
import { styles } from './AnalyticsScreen.styles';

const MONTHS_BACK = 5; // the stepper and trend cover the last 6 months

export default function AnalyticsScreen() {
  const { transactions, loading } = useTransactions('last12Months');
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

                {categories.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Where your money went</Text>
                      <Text style={styles.cardMeta}>{formatINR(totals.spent)} total</Text>
                    </View>
                    <CategoryBars data={categories} />
                  </View>
                )}

                {totals.spent > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Daily spending</Text>
                      <Text style={styles.cardMeta}>{monthLabel(month, 'short')}</Text>
                    </View>
                    <DailyChart points={days} average={avg} monthKey={month} />
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

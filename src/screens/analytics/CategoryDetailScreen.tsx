import { ScreenHeader, SectionLabel } from '@/components/ui';
import { ChartColors } from '@/constants/chartColors';
import { findCategory } from '@/constants/categories';
import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { categoryTotals, categoryTrend, monthLabel, shiftMonth, ym } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HEIGHT = 110;

export default function CategoryDetailScreen() {
  const { id, month: monthParam } = useLocalSearchParams<{ id: string; month?: string }>();
  const router = useRouter();
  const current = ym(new Date());
  const [month, setMonth] = useState(monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : current);
  const { transactions, loading } = useTransactions('last12Months');
  const { settings } = useSettings();

  const cat = findCategory('expense', id);
  const name = cat?.label ?? 'Other';
  const isCurrent = month === current;
  const today = new Date().getDate();
  const prevKey = shiftMonth(month, -1);

  const total = categoryTotals(transactions, month).get(id) ?? 0;
  const before = categoryTotals(transactions, prevKey, isCurrent ? today : undefined).get(id) ?? 0;
  const change = before > 0 ? Math.round(((total - before) / before) * 100) : null;
  const trend = categoryTrend(transactions, id, current, 6);
  const trendMax = Math.max(...trend.map((t) => t.amount), 1);
  const avg6 = trend.filter((t) => t.key !== current).reduce((s, t) => s + t.amount, 0) / 5;
  const items = transactions
    .filter((t) => t.type === 'expense' && t.category === id && ym(new Date(t.date)) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const limit = settings.categoryBudgets?.[id];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/analytics'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={name} icon={(cat?.icon ?? 'ellipsis-horizontal') as any} onBack={goBack} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{monthLabel(month).toUpperCase()}</Text>
              <Text style={styles.heroAmount}>{formatINR(total)}</Text>
              <Text style={styles.heroSub}>
                {items.length} transaction{items.length === 1 ? '' : 's'}
                {items.length > 0 ? ` · avg ${formatINR(Math.round(total / items.length))}` : ''}
              </Text>
              {change !== null && (
                <Text style={styles.heroSub}>
                  {change === 0 ? 'Same as' : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs`}{' '}
                  {monthLabel(prevKey, 'short')}
                  {isCurrent ? ` 1–${today}` : ''}
                </Text>
              )}
              {limit !== undefined && (
                <View style={styles.meterWrap}>
                  <View style={styles.meterTrack}>
                    <View
                      style={[
                        styles.meterFill,
                        { width: `${Math.min((total / limit) * 100, 100)}%`, backgroundColor: total > limit ? Corpus.danger : ChartColors.spend },
                      ]}
                    />
                  </View>
                  <Text style={[styles.heroSub, total > limit && { color: Corpus.danger }]}>
                    {total > limit
                      ? `Over the ${formatINR(limit)} budget by ${formatINR(total - limit)}`
                      : `${formatINR(limit - total)} left of the ${formatINR(limit)} budget`}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Last 6 months</Text>
                <Text style={styles.cardMeta}>5-month avg {formatINR(Math.round(avg6))}</Text>
              </View>
              <View style={styles.plot}>
                {avg6 > 0 && <View style={[styles.avgLine, { bottom: (avg6 / trendMax) * HEIGHT }]} />}
                {trend.map((t) => {
                  const active = t.key === month;
                  return (
                    <Pressable key={t.key} style={styles.slot} onPress={() => setMonth(t.key)}>
                      {active && t.amount > 0 && <Text style={styles.value}>{formatINR(t.amount)}</Text>}
                      <View
                        style={[
                          styles.col,
                          {
                            height: t.amount > 0 ? Math.max((t.amount / trendMax) * HEIGHT, 3) : 0,
                            opacity: active ? 1 : 0.4,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.xRow}>
                {trend.map((t) => (
                  <Text key={t.key} style={[styles.xLabel, t.key === month && { color: Corpus.text, fontWeight: '600' }]}>
                    {monthLabel(t.key, 'short')}
                  </Text>
                ))}
              </View>
              <Text style={styles.cardMeta}>Dashed line = average of the 5 months before this one · tap a month</Text>
            </View>

            <SectionLabel>{`${name.toUpperCase()} IN ${monthLabel(month, 'short').toUpperCase()}`}</SectionLabel>
            <View style={styles.group}>
              {items.length === 0 ? (
                <Text style={styles.empty}>No {name.toLowerCase()} spending this month</Text>
              ) : (
                items.map((t) => (
                  <View key={t.id} style={styles.item}>
                    <TransactionRow tx={t} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: t.id } })} />
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { padding: Space.lg, paddingBottom: 120, gap: Space.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: Corpus.card, borderRadius: Radius.xl, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.lg, alignItems: 'center', gap: 4 },
  heroLabel: { fontSize: Type.caption, color: Corpus.textMuted, letterSpacing: 0.6 },
  heroAmount: { fontSize: Type.amount, fontWeight: '600', color: Corpus.text },
  heroSub: { fontSize: Type.small, color: Corpus.textMuted },
  meterWrap: { alignSelf: 'stretch', gap: 6, marginTop: Space.sm, alignItems: 'center' },
  meterTrack: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: ChartColors.track, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4 },
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 10 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  cardMeta: { fontSize: Type.caption, color: Corpus.textMuted },
  plot: { height: HEIGHT + 18, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: ChartColors.grid },
  avgLine: { pointerEvents: 'none', position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: Corpus.textMuted },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  col: { width: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: ChartColors.spend },
  value: { fontSize: Type.micro, color: Corpus.text, marginBottom: 3 },
  xRow: { flexDirection: 'row' },
  xLabel: { flex: 1, textAlign: 'center', fontSize: Type.caption, color: Corpus.textMuted },
  group: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, paddingVertical: 4 },
  item: { paddingHorizontal: Space.md, paddingVertical: 8 },
  empty: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center', paddingVertical: Space.lg },
  center: { alignItems: 'center', paddingVertical: 80 },
});

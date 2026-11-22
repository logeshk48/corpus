import Bullet from '@/components/charts/Bullet';
import MonthBars from '@/components/charts/MonthBars';
import { Button, Group, IconChip, Screen } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus, Font, tabular, Type } from '@/constants/theme';
import { useEntrance } from '@/hooks/useEntrance';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { categoryTotals, categoryTrend, monthLabel, shiftMonth, ym } from '@/utils/analytics';
import { formatINR } from '@/utils/format';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// One category up close: what this month cost, how it compares, the last six months as columns you can tap,
// where in the category the money went, and every spend.
export default function CategoryDetailScreen() {
  const { id, month: monthParam } = useLocalSearchParams<{ id: string; month?: string }>();
  const router = useRouter();
  const current = ym(new Date());
  const [month, setMonth] = useState(monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : current);
  const { transactions, loading } = useTransactions('last12Months');
  const { settings } = useSettings();
  const t = useEntrance(800, loading);

  const cat = findCategory('expense', id);
  const name = cat?.label ?? 'Other';
  const color = CategoryChip[id] ?? Chip.gray;
  const isCurrent = month === current;
  const today = new Date().getDate();
  const prevKey = shiftMonth(month, -1);

  const total = categoryTotals(transactions, month).get(id) ?? 0;
  const before = categoryTotals(transactions, prevKey, isCurrent ? today : undefined).get(id) ?? 0;
  const change = before > 0 ? Math.round(((total - before) / before) * 100) : null;
  const trend = categoryTrend(transactions, id, current, 6);
  const avg5 = trend.filter((x) => x.key !== current).reduce((a, x) => a + x.amount, 0) / 5;
  const bars = trend.map((x) => ({ key: x.key, label: monthLabel(x.key, 'short'), full: monthLabel(x.key), value: x.amount }));
  const items = transactions.filter((x) => x.type === 'expense' && x.category === id && ym(new Date(x.date)) === month).sort((a, b) => b.date.localeCompare(a.date));
  const limit = settings.categoryBudgets?.[id];
  const totalV = useTween(loading ? 0 : total);

  // the same note several times (Swiggy, Uber, Zepto) is where the money really went
  const byNote = new Map<string, { label: string; amount: number; count: number }>();
  for (const x of items) {
    const label = (x.note ?? '').trim();
    if (!label) continue;
    const k = label.toLowerCase();
    const g = byNote.get(k) ?? { label, amount: 0, count: 0 };
    g.amount += x.amount; g.count += 1;
    byNote.set(k, g);
  }
  const places = [...byNote.values()].filter((g) => g.count > 1 || g.amount >= total * 0.2).sort((a, b) => b.amount - a.amount).slice(0, 3);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/analytics'));
  const vsText = change === null ? null
    : change === 0 ? `Same as ${monthLabel(prevKey, 'short')}${isCurrent ? ` 1 to ${today}` : ''}`
    : `${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than ${monthLabel(prevKey, 'short')}${isCurrent ? ` 1 to ${today}` : ''}`;

  return (
    <Screen title={name} tone={color} onBack={goBack}>
      {loading ? (
        <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 80 }} />
      ) : (
        <>
          <View style={s.hero}>
            <View style={s.heroTop}>
              <IconChip icon={cat?.icon ?? 'ellipsis-horizontal'} color={color} size={44} />
              <Text style={s.heroLabel}>{monthLabel(month)}</Text>
            </View>
            <Text style={s.big}>{formatINR(Math.round(totalV))}</Text>
            <Text style={s.sub}>{items.length === 0 ? 'Nothing spent' : `${items.length} spend${items.length === 1 ? '' : 's'}, about ${formatINR(Math.round(total / items.length))} each`}</Text>
            {vsText && <Text style={[s.sub, change !== null && change > 0 ? { color: Corpus.danger } : change !== null && change < 0 ? { color: Corpus.income } : null]}>{vsText}</Text>}
            {limit !== undefined ? (
              <View style={s.meter} accessible accessibilityLabel={`${formatINR(total)} of a ${formatINR(limit)} limit`}>
                <Bullet value={total} limit={limit} color={total > limit ? Corpus.danger : color} height={10} appear={t} />
                <Text style={[s.sub, total > limit && { color: Corpus.danger }]}>
                  {total > limit ? `${formatINR(total - limit)} over your ${formatINR(limit)} limit` : `${formatINR(limit - total)} left of your ${formatINR(limit)} limit`}
                </Text>
              </View>
            ) : (
              <Button size="sm" variant="secondary" icon="speedometer-outline" label="Set a monthly limit" onPress={() => router.push('/budgets' as Href)} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Last 6 months</Text>
            <MonthBars bars={bars} color={color} target={avg5 > 0 ? Math.round(avg5) : undefined} targetLabel="Usual" zeroLabel="Nothing" height={110} appear={t}
              selected={Math.max(0, bars.findIndex((b) => b.key === month))} onSelect={(k) => setMonth(bars[k].key)} />
          </View>

          {places.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Where it went</Text>
              {places.map((g) => (
                <View key={g.label} style={s.place}>
                  <View style={s.placeTop}>
                    <Text style={s.placeName} numberOfLines={1}>{g.label}</Text>
                    <Text style={s.placeAmt}>{formatINR(g.amount)}</Text>
                  </View>
                  <Bullet value={g.amount} limit={total} color={color} height={6} appear={t} />
                  <Text style={s.placeSub}>{g.count} time{g.count === 1 ? '' : 's'}, {Math.round((g.amount / total) * 100)}% of {name.toLowerCase()}</Text>
                </View>
              ))}
            </View>
          )}

          <Group animate title={`${monthLabel(month, 'short')} spends`}>
            {items.length === 0
              ? [<View key="none" style={{ padding: 16 }}><Text style={s.sub}>No {name.toLowerCase()} spending in {monthLabel(month)}</Text></View>]
              : items.map((x) => <TransactionRow key={x.id} tx={x} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: x.id } })} />)}
          </Group>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  heroLabel: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.textMuted },
  big: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  sub: { fontSize: Type.bodyLg, color: Corpus.textMuted, ...tabular },
  meter: { gap: 6, marginTop: 12 },
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: 16, gap: 14 },
  cardTitle: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text },
  place: { gap: 6 },
  placeTop: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  placeName: { flex: 1, fontSize: Type.input, color: Corpus.text },
  placeAmt: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  placeSub: { fontSize: Type.small, color: Corpus.textMuted },
});

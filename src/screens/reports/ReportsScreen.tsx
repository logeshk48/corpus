import { ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useAssets } from '@/hooks/useAssets';
import { useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { getTransactions } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { compactINR, formatINR } from '@/utils/format';
import { findCategory } from '@/constants/categories';
import { currentYear, yearLabel, yearRange, yearReport, type YearKind } from '@/utils/yearReport';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './ReportsScreen.styles';

const pct = (r: number | null) => (r == null ? '—' : `${r < 0 ? '−' : ''}${Math.abs(Math.round(r * 100))}%`);

export default function ReportsScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const [kind, setKind] = useState<YearKind>('fy');
  const [year, setYear] = useState(currentYear('fy'));
  const [tx, setTx] = useState<Transaction[] | null>(null);
  const { investments } = useInvestments();
  const { snapshots } = useAssets();

  useEffect(() => {
    let alive = true;
    setTx(null);
    const { start, end } = yearRange(kind, year);
    getTransactions(start, end)
      .then((l) => alive && setTx(l))
      .catch(() => alive && setTx([]));
    return () => {
      alive = false;
    };
  }, [kind, year]);

  const r = useMemo(() => (tx ? yearReport(tx, investments, kind, year) : null), [tx, investments, kind, year]);
  const isNow = year === currentYear(kind);
  // net worth at the start and end of the year (from the monthly snapshots)
  const nw = useMemo(() => {
    if (!r) return null;
    const keys = Object.keys(snapshots).sort();
    const first = keys.find((k) => k >= r.months[0].key);
    const last = [...keys].reverse().find((k) => k <= r.months[11].key);
    if (!first || !last || first === last) return null;
    return { from: snapshots[first].total, to: snapshots[last].total, fromKey: first, toKey: last };
  }, [r, snapshots]);
  const maxSpent = r ? Math.max(1, ...r.months.map((m) => Math.max(m.spent, m.income))) : 1;
  const mLabel = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Year report" onBack={() => (router.canGoBack() ? router.back() : router.replace('/analytics' as Href))} />

        <View style={styles.tabs}>
          {(['fy', 'calendar'] as const).map((k) => (
            <Pressable key={k} style={[styles.tab, kind === k && styles.tabOn]} onPress={() => (setKind(k), setYear(currentYear(k)))}>
              <Text style={[styles.tabText, kind === k && { color: Corpus.gold }]}>{k === 'fy' ? 'Financial year (Apr–Mar)' : 'Calendar year'}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.stepper}>
          <Pressable style={styles.arrow} onPress={() => setYear(year - 1)} accessibilityLabel="Previous year">
            <Ionicons name="chevron-back" size={18} color={Corpus.text} />
          </Pressable>
          <Text style={styles.stepperText}>
            {yearLabel(kind, year)}
            {isNow ? ' · so far' : ''}
          </Text>
          <Pressable style={styles.arrow} onPress={() => !isNow && setYear(year + 1)} disabled={isNow} accessibilityLabel="Next year">
            <Ionicons name="chevron-forward" size={18} color={isNow ? Corpus.textFaint : Corpus.text} />
          </Pressable>
        </View>

        {kind === 'fy' && (
          <Pressable style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: Corpus.goldLine }]} onPress={() => router.push(`/tax?year=${year}` as Href)}>
            <Ionicons name="receipt-outline" size={18} color={Corpus.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Tax summary for your ITR</Text>
              <Text style={styles.meta}>Capital gains, dividends, FD interest, deductions found</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
          </Pressable>
        )}

        {!r ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 50 }} />
        ) : r.count === 0 ? (
          <Text style={[styles.meta, { textAlign: 'center', paddingVertical: 40 }]}>Nothing logged in {yearLabel(kind, year)}.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.grid}>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>EARNED</Text>
                  <Text style={[styles.cellValue, { color: Corpus.income }]}>{compactINR(r.income)}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>SPENT</Text>
                  <Text style={styles.cellValue}>{compactINR(r.spent)}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>SAVED</Text>
                  <Text style={[styles.cellValue, { color: r.saved >= 0 ? Corpus.income : Corpus.danger }]}>{compactINR(r.saved)}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>SAVINGS RATE</Text>
                  <Text style={styles.cellValue}>{pct(r.rate)}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>INVESTED</Text>
                  <Text style={styles.cellValue}>{compactINR(r.invested)}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>BILLS & EMIs PAID</Text>
                  <Text style={styles.cellValue}>{compactINR(r.billsPaid)}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Average spending {formatINR(Math.round(r.avgSpend))} a month over {r.activeMonths} month{r.activeMonths === 1 ? '' : 's'} with entries.
                {r.best && r.worst && r.best.key !== r.worst.key ? ` Best month ${r.best.label} (${pct(r.best.rate)} saved), toughest ${r.worst.label} (${pct(r.worst.rate)}).` : ''}
              </Text>
              {nw && (
                <Text style={styles.meta}>
                  Net worth {formatINR(Math.round(nw.from))} ({mLabel(nw.fromKey)}) →{' '}
                  <Text style={{ color: nw.to >= nw.from ? Corpus.income : Corpus.danger, fontWeight: '600' }}>{formatINR(Math.round(nw.to))}</Text> ({mLabel(nw.toKey)}),{' '}
                  {nw.to >= nw.from ? '+' : '−'}{formatINR(Math.abs(Math.round(nw.to - nw.from)))}.
                </Text>
              )}
            </View>

            <SectionLabel right="earned · spent">MONTH BY MONTH</SectionLabel>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={[styles.head, { width: 34, textAlign: 'left' }]}>MONTH</Text>
                <Text style={[styles.head, { flex: 1 }]} />
                <Text style={[styles.head, { width: 70 }]}>SPENT</Text>
                <Text style={[styles.head, { width: 70 }]}>SAVED</Text>
                <Text style={[styles.head, { width: 40 }]}>RATE</Text>
              </View>
              {r.months.map((m) => (
                <Pressable key={m.key} style={[styles.row, m.future && { opacity: 0.35 }]} onPress={() => router.push('/analytics' as Href)} disabled={m.future}>
                  <Text style={[styles.col, { width: 34, textAlign: 'left', color: Corpus.textMuted }]}>{m.label}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${(m.income / maxSpent) * 100}%`, backgroundColor: Corpus.income }]} />
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${(m.spent / maxSpent) * 100}%` }]} />
                    </View>
                  </View>
                  <Text style={[styles.col, { width: 70 }]}>{m.spent ? compactINR(m.spent) : '—'}</Text>
                  <Text style={[styles.col, { width: 70, color: m.saved < 0 ? Corpus.danger : Corpus.text }]}>{m.income || m.spent ? compactINR(m.saved) : '—'}</Text>
                  <Text style={[styles.col, { width: 40, color: Corpus.textMuted }]}>{pct(m.rate)}</Text>
                </Pressable>
              ))}
            </View>

            <SectionLabel right={`${formatINR(r.spent)} total`}>WHERE IT WENT</SectionLabel>
            <View style={styles.card}>
              {r.categories.slice(0, 8).map((c) => (
                <Pressable key={c.id} style={styles.row} onPress={() => router.push(`/category/${c.id}` as Href)}>
                  <Text style={[styles.col, { width: 90, textAlign: 'left' }]} numberOfLines={1}>{c.label}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${c.share * 100}%` }]} />
                  </View>
                  <Text style={[styles.col, { width: 74 }]}>{compactINR(c.amount)}</Text>
                  <Text style={[styles.col, { width: 36, color: Corpus.textMuted }]}>{Math.round(c.share * 100)}%</Text>
                </Pressable>
              ))}
              {r.categories[0] && r.activeMonths > 0 && (
                <Text style={styles.meta}>
                  {r.categories[0].label} averaged {formatINR(Math.round(r.categories[0].amount / r.activeMonths))} a month.
                  {settings.categoryBudgets?.[r.categories[0].id] ? ` Your limit is ${formatINR(settings.categoryBudgets[r.categories[0].id])}.` : ''}
                </Text>
              )}
            </View>

            {r.biggest.length > 0 && (
              <>
                <SectionLabel>BIGGEST SPENDS</SectionLabel>
                <View style={styles.card}>
                  {r.biggest.map((t) => (
                    <Pressable key={t.id} style={styles.row} onPress={() => router.push(`/edit/${t.id}` as Href)}>
                      <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                        <Text style={{ color: Corpus.text }}>{t.note || findCategory('expense', t.category)?.label || t.category}</Text> · {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.col}>{formatINR(t.amount)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <Text style={styles.note}>
              Same rules as Home and Analytics: saved = earned − spent; SIPs and other purchases count as invested. Entries on {r.loggedDays} days this {kind === 'fy' ? 'financial ' : ''}year
              {isNow ? ' so far' : ''} — days you didn’t log make spending look lower.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import AreaTrend from '@/components/charts/AreaTrend';
import Donut from '@/components/charts/Donut';
import DataHealthCard from '@/components/DataHealthCard';
import { Group, GroupRow, Screen, Segmented, Stepper } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssets } from '@/hooks/useAssets';
import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useRealized } from '@/hooks/useRealized';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { getTransactions } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { accountBalances } from '@/utils/accounts';
import { saveCsv } from '@/utils/csv';
import { dataHealth } from '@/utils/dataHealth';
import { capitalGainsCsv, holdingsCsv, transactionsCsv } from '@/utils/exports';
import { compactINR, formatINR } from '@/utils/format';
import { currentYear, yearLabel, yearRange, yearReport, type YearKind } from '@/utils/yearReport';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { styles } from './ReportsScreen.styles';

const pct = (r: number | null) => (r == null ? '' : `${r < 0 ? '−' : ''}${Math.abs(Math.round(r * 100))}%`);
const mLabel = (k: string) => new Date(`${k}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

// Your year on one page: what you saved first, then the months as a chart you can tap, where the money went,
// the biggest spends, and the files your CA or ITR needs.
export default function ReportsScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [kind, setKind] = useState<YearKind>('fy');
  const [year, setYear] = useState(currentYear('fy'));
  const [tx, setTx] = useState<Transaction[] | null>(null);
  const { investments } = useInvestments();
  const { snapshots } = useAssets();
  const { all: allAccounts, accounts } = useAccounts();
  const { bills } = useBills();
  const realized = useRealized();
  const { transactions: last12 } = useTransactions('last12Months');
  const health = useMemo(
    () => dataHealth({ tx: last12, accounts: accountBalances(accounts, last12), investments, dismissed: settings.dismissedInsights ?? [] }),
    [last12, accounts, investments, settings.dismissedInsights]
  );

  useEffect(() => {
    let alive = true;
    setTx(null);
    const { start, end } = yearRange(kind, year);
    getTransactions(start, end).then((l) => alive && setTx(l)).catch(() => alive && setTx([]));
    return () => { alive = false; };
  }, [kind, year]);

  const r = useMemo(() => (tx ? yearReport(tx, investments, kind, year) : null), [tx, investments, kind, year]);
  const isNow = year === currentYear(kind);
  const label = yearLabel(kind, year);
  const nw = useMemo(() => {
    if (!r) return null;
    const keys = Object.keys(snapshots).sort();
    const first = keys.find((k) => k >= r.months[0].key);
    const last = [...keys].reverse().find((k) => k <= r.months[11].key);
    if (!first || !last || first === last) return null;
    return { from: snapshots[first].total, to: snapshots[last].total, fromKey: first, toKey: last };
  }, [r, snapshots]);

  const shown = r ? r.months.filter((m) => !m.future) : [];
  const [month, setMonth] = useState('');
  useEffect(() => { if (shown.length) setMonth(shown[shown.length - 1].key); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [r]);
  const picked = shown.find((m) => m.key === month);
  const savedV = useTween(r ? r.saved : 0);

  const top = r ? r.categories.slice(0, 4) : [];
  const rest = r ? r.categories.slice(4).reduce((a, c) => a + c.amount, 0) : 0;
  const slices = [...top.map((c) => ({ id: c.id, value: c.amount, color: CategoryChip[c.id] ?? Chip.gray, label: c.label, share: c.share })),
    ...(rest > 0 && r ? [{ id: 'rest', value: rest, color: Chip.gray, label: 'Everything else', share: r.spent ? rest / r.spent : 0 }] : [])];

  const file = (what: string) => `corpus-${what}-${label.replace(/\s+/g, '').toLowerCase()}.csv`;
  const exportIt = async (name: string, csv: string, rows: number) => {
    if (!rows) return showToast({ message: 'Nothing to export for this year' });
    try {
      const how = await saveCsv(name, csv);
      showToast({ message: how === 'downloaded' ? `${name} downloaded. It opens in Excel or Sheets` : 'Choose where to send it' });
    } catch {
      showToast({ message: 'Couldn’t export. Try again.' });
    }
  };
  const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-IN', { month: 'long' });
  const sales = r ? realized.filter((x) => new Date(x.date) >= r.start && new Date(x.date) < r.end) : [];

  return (
    <Screen title="Year report" tone={Chip.indigo} onBack={() => (router.canGoBack() ? router.back() : router.replace('/analytics' as Href))}>
      <View style={{ gap: 10 }}>
        <Segmented options={[{ value: 'fy', label: 'Financial year' }, { value: 'calendar', label: 'Calendar year' }] as const} value={kind} onChange={(k) => { setKind(k); setYear(currentYear(k)); }} />
        <Stepper label="Year" value={label} sub={isNow ? 'So far' : kind === 'fy' ? 'April to March' : 'January to December'} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} nextDisabled={isNow} />
      </View>

      {!r ? (
        <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 50 }} />
      ) : r.count === 0 ? (
        <View style={styles.hero}><Text style={styles.sub}>Nothing logged in {label}.</Text></View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.label}>{r.saved >= 0 ? 'Saved' : 'Spent more than you earned'} in {label}{isNow ? ' so far' : ''}</Text>
            <Text style={[styles.big, r.saved < 0 && { color: Corpus.danger }]} numberOfLines={1}>{r.saved < 0 ? '−' : ''}{formatINR(Math.abs(Math.round(savedV)))}</Text>
            {r.rate != null && <Text style={styles.sub}>{pct(r.rate)} of what came in</Text>}
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statLabel}>Earned</Text><Text style={[styles.statValue, { color: Corpus.income }]}>{compactINR(r.income)}</Text></View>
              <View style={styles.rule} />
              <View style={styles.stat}><Text style={styles.statLabel}>Spent</Text><Text style={styles.statValue}>{compactINR(r.spent)}</Text></View>
              <View style={styles.rule} />
              <View style={styles.stat}><Text style={styles.statLabel}>Invested</Text><Text style={styles.statValue}>{compactINR(r.invested)}</Text></View>
            </View>
            {nw && (
              <Text style={styles.foot}>
                Net worth went from {formatINR(Math.round(nw.from))} in {mLabel(nw.fromKey)} to {formatINR(Math.round(nw.to))} in {mLabel(nw.toKey)},{' '}
                <Text style={{ color: nw.to >= nw.from ? Corpus.income : Corpus.danger }}>{nw.to >= nw.from ? 'up' : 'down'} {formatINR(Math.abs(Math.round(nw.to - nw.from)))}</Text>.
              </Text>
            )}
          </View>

          {shown.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Month by month</Text>
              <AreaTrend data={shown.map((m) => ({ key: m.key, label: m.label, a: m.income, b: m.spent }))} selected={month} onSelect={setMonth} />
              {picked && (
                <View style={styles.stats}>
                  <View style={styles.stat}><Text style={styles.statLabel}>{picked.label} earned</Text><Text style={styles.statValue}>{compactINR(picked.income)}</Text></View>
                  <View style={styles.rule} />
                  <View style={styles.stat}><Text style={styles.statLabel}>Spent</Text><Text style={styles.statValue}>{compactINR(picked.spent)}</Text></View>
                  <View style={styles.rule} />
                  <View style={styles.stat}><Text style={styles.statLabel}>Saved</Text><Text style={[styles.statValue, { color: picked.saved < 0 ? Corpus.danger : Corpus.text }]}>{picked.income || picked.spent ? `${compactINR(picked.saved)}${picked.rate != null ? ` (${pct(picked.rate)})` : ''}` : 'Nothing'}</Text></View>
                </View>
              )}
              {r.best && r.worst && r.best.key !== r.worst.key && (
                <Text style={styles.foot}>Best month {r.best.label}, {pct(r.best.rate)} saved. Hardest {r.worst.label}, {pct(r.worst.rate)}.</Text>
              )}
            </View>
          )}

          {slices.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Where it went</Text>
              <View style={styles.split}>
                <Donut data={slices} size={118} thickness={16} track={Corpus.cardAlt}>
                  <Text style={styles.donutNum}>{compactINR(r.spent)}</Text>
                  <Text style={styles.donutLabel}>spent</Text>
                </Donut>
                <View style={styles.legend}>
                  {slices.map((sl) => (
                    <View key={sl.id} style={styles.legendRow}>
                      <View style={[styles.dot, { backgroundColor: sl.color }]} />
                      <Text style={styles.legendName} numberOfLines={1}>{sl.label}</Text>
                      <Text style={styles.legendPct}>{Math.round(sl.share * 100)}%</Text>
                    </View>
                  ))}
                </View>
              </View>
              {r.categories[0] && r.activeMonths > 0 && (
                <Text style={styles.foot}>
                  {r.categories[0].label} averaged {formatINR(Math.round(r.categories[0].amount / r.activeMonths))} a month.
                  {settings.categoryBudgets?.[r.categories[0].id] ? ` Your limit is ${formatINR(settings.categoryBudgets[r.categories[0].id])}.` : ''}
                </Text>
              )}
            </View>
          )}

          {r.biggest.length > 0 && (
            <Group title="Biggest spends">
              {r.biggest.map((t) => {
                const c = findCategory('expense', t.category);
                return (
                  <GroupRow key={t.id} icon={c?.icon ?? 'pricetag'} color={CategoryChip[t.category] ?? Chip.gray} title={t.note || c?.label || t.category}
                    subtitle={new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} value={formatINR(t.amount)} valueColor={Corpus.text}
                    onPress={() => router.push(`/edit/${t.id}` as Href)} />
                );
              })}
            </Group>
          )}
        </>
      )}

      <Group title="Look closer">
        <GroupRow icon="calendar-number" color={Chip.orange} title={`Review ${lastMonth}`} subtitle="How last month went, and 3 things to do now" onPress={() => router.push('/?review=1' as Href)} />
        {kind === 'fy' ? <GroupRow icon="receipt" color={Chip.green} title="Tax summary for your ITR" subtitle="Capital gains, dividends, FD interest, deductions" onPress={() => router.push(`/tax?year=${year}` as Href)} /> : null}
      </Group>

      <DataHealthCard h={health} />

      {r && (
        <Group title="Export for Excel or Sheets">
          <GroupRow icon="list" color={Chip.blue} title={`All entries, ${label}`} subtitle={`${r.count} entries with category, note and account`} onPress={() => exportIt(file('entries'), transactionsCsv(tx ?? [], allAccounts, bills), r.count)} chevron={false} right={<Text style={styles.csv}>CSV</Text>} />
          <GroupRow icon="trending-up" color={Chip.indigo} title="Capital gains for your CA" subtitle={`${sales.length} sale${sales.length === 1 ? '' : 's'}, short and long-term, FIFO cost`} onPress={() => exportIt(file('capital-gains'), capitalGainsCsv(sales), sales.length)} chevron={false} right={<Text style={styles.csv}>CSV</Text>} />
          <GroupRow icon="pie-chart" color={Chip.purple} title="Holdings today" subtitle={`${investments.length} investment${investments.length === 1 ? '' : 's'} with value, gain and XIRR`} onPress={() => exportIt(`corpus-holdings-${new Date().toISOString().slice(0, 10)}.csv`, holdingsCsv(investments), investments.length)} chevron={false} right={<Text style={styles.csv}>CSV</Text>} />
        </Group>
      )}

      {r && r.count > 0 && (
        <Text style={styles.note}>
          Saved means earned minus spent. SIPs and other purchases count as invested. You logged on {r.loggedDays} days this {kind === 'fy' ? 'financial ' : ''}year{isNow ? ' so far' : ''}, and days you skip make spending look lower. On the web an export downloads a file; on your phone it opens the share sheet.
        </Text>
      )}
    </Screen>
  );
}

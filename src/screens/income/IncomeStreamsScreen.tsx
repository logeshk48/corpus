import Bullet from '@/components/charts/Bullet';
import MonthBars, { lastMonths } from '@/components/charts/MonthBars';
import { Button, Group, GroupRow, IconChip, Screen } from '@/components/ui';
import { Chip, Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useEntrance } from '@/hooks/useEntrance';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { addIncomeStream } from '@/services/incomeStreams';
import type { NewIncomeStream } from '@/types/incomeStream';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import StreamCard from './components/StreamCard';
import GotPaidSheet from './components/GotPaidSheet';
import { logPaid } from './logPaid';
import { usualOf, type Usual } from '@/utils/incomeUsual';
import { useSettings } from '@/hooks/useSettings';
import type { IncomeStream } from '@/types/incomeStream';
import StreamSheet from './components/StreamSheet';
import { styles } from './IncomeStreamsScreen.styles';

export default function IncomeStreamsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { streams, loading: streamsLoading } = useIncomeStreams();
  const { transactions: yearTx, loading: txLoading } = useTransactions('last12Months');
  const loading = streamsLoading || txLoading;
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState<IncomeStream | null>(null);
  const { settings } = useSettings();
  const t = useEntrance(800, loading);

  const income = useMemo(() => yearTx.filter((x) => x.type === 'income'), [yearTx]);
  const month = getRange('month');
  const thisMonth = income.filter((x) => isInRange(x.date, month));
  const received = new Map<string, number>();
  for (const x of thisMonth) if (x.streamId) received.set(x.streamId, (received.get(x.streamId) ?? 0) + x.amount);
  const ids = new Set(streams.map((s) => s.id));
  const unlinked = thisMonth.filter((x) => !x.streamId || !ids.has(x.streamId)).reduce((a, x) => a + x.amount, 0);
  const total = thisMonth.reduce((a, x) => a + x.amount, 0);
  // Only sources that pay the same every month have an "expected" amount; the rest are compared with your usual
  const allFixed = streams.length > 0 && streams.every((s) => s.fixed && s.expectedMonthly);
  const expected = allFixed ? streams.reduce((a, s) => a + (s.expectedMonthly ?? 0), 0) : 0;
  const usual = useMemo(() => {
    const m = new Map<string, Usual>();
    for (const s of streams) m.set(s.id, usualOf(income.filter((x) => x.streamId === s.id)));
    return m;
  }, [streams, income]);
  const totalV = useTween(loading ? 0 : total);

  const bars = useMemo(() => lastMonths(6).map((m) => ({ ...m, value: income.filter((x) => isInRange(x.date, m)).reduce((a, x) => a + x.amount, 0) })), [income]);
  const past = bars.slice(0, -1).filter((b) => b.value > 0);
  const avg = past.length ? Math.round(past.reduce((a, b) => a + b.value, 0) / past.length) : 0;
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' });
  const sorted = [...streams].sort((a, b) => (received.get(b.id) ?? 0) - (received.get(a.id) ?? 0) || (b.expectedMonthly ?? 0) - (a.expectedMonthly ?? 0));

  const create = async (s: NewIncomeStream) => {
    try {
      await addIncomeStream(s);
      setAdding(false);
      showToast({ message: `${s.name} added` });
    } catch (e) {
      console.error('Save stream failed:', e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };

  return (
    <>
      <Screen title="Income" subtitle="Where your money comes from" right={streams.length > 0 ? <Button size="sm" icon="add" label="Add" onPress={() => setAdding(true)} /> : undefined}>
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading income" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 260 }]} />
            <View style={[styles.skel, { height: 160 }]} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.label}>Came in during {monthName}</Text>
              <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(totalV))}</Text>
              {expected > 0 ? (
                <View style={{ gap: 2 }} accessible accessibilityLabel={`${formatINR(total)} of ${formatINR(expected)} expected`}>
                  <Bullet value={total} limit={expected} color={Corpus.income} height={10} appear={t} />
                  <Text style={styles.sub}>
                    {total >= expected ? `All ${formatINR(expected)} you expected has come in` : `${formatINR(expected - total)} of the ${formatINR(expected)} you expect is still to come`}
                  </Text>
                </View>
              ) : avg > 0 ? (
                <Text style={styles.sub}>
                  {total === 0 ? `Nothing yet. A usual month brings about ${formatINR(avg)}` : total >= avg ? `${formatINR(total - avg)} more than your usual ${formatINR(avg)} a month` : `${formatINR(avg - total)} below your usual ${formatINR(avg)} so far`}
                </Text>
              ) : null}
              {bars.some((b) => b.value > 0) && (
                <View style={styles.chart}>
                  <MonthBars bars={bars} color={Corpus.income} target={expected || avg || undefined} targetLabel={expected ? 'Expected' : 'Your average'} appear={t} />
                </View>
              )}
            </View>

            {streams.length === 0 ? (
              <View style={styles.empty}>
                <IconChip icon="git-branch" color={Chip.green} size={44} />
                <Text style={styles.emptyTitle}>Name your income sources</Text>
                <Text style={styles.emptyText}>Add your salary, each client or your business. You’ll see what each one pays, and what is still to come this month.</Text>
                <Button label="Add the first one" icon="add" onPress={() => setAdding(true)} style={{ alignSelf: 'stretch', marginTop: 6 }} />
              </View>
            ) : (
              <Group animate title="Sources">
                {[
                  ...sorted.map((s) => (
                    <StreamCard key={s.id} stream={s} receivedThisMonth={received.get(s.id) ?? 0} usual={usual.get(s.id)!} onPaid={() => setPaying(s)} appear={t} onPress={() => router.push({ pathname: '/income/[id]', params: { id: s.id } })} />
                  )),
                  ...(unlinked > 0
                    ? [<GroupRow key="unlinked" icon="help" color={Chip.gray} title="No source picked" subtitle="Income logged without a source" value={formatINR(unlinked)} valueColor={Corpus.text} onPress={() => router.push('/transactions' as Href)} />]
                    : []),
                ]}
              </Group>
            )}
            {streams.length > 0 && <Text style={styles.foot}>Tap “Got paid” when money comes in. Corpus learns what a usual month looks like for each source.</Text>}
          </>
        )}
      </Screen>
      {adding && <StreamSheet onClose={() => setAdding(false)} onSave={create} />}
      {paying && (
        <GotPaidSheet
          stream={paying}
          usual={usual.get(paying.id) ?? usualOf([])}
          onClose={() => setPaying(null)}
          onSave={async (amount, date, note) => {
            try {
              await logPaid(paying, amount, date, note, settings.defaultAccountId);
              setPaying(null);
              showToast({ message: `${formatINR(amount)} from ${paying.name} added` });
            } catch (e) {
              console.error(e);
              showToast({ message: 'Couldn’t save. Try again.' });
            }
          }}
        />
      )}
    </>
  );
}

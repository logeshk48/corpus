import Bullet from '@/components/charts/Bullet';
import MonthBars, { lastMonths } from '@/components/charts/MonthBars';
import { Group, IconButton, Screen } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useEntrance } from '@/hooks/useEntrance';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { askWeb } from '@/services/confirm';
import { addIncomeStream, deleteIncomeStream, updateIncomeStream } from '@/services/incomeStreams';
import { streamTypeMeta, type NewIncomeStream } from '@/types/incomeStream';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { stateLine, streamColor } from './components/StreamCard';
import GotPaidSheet from './components/GotPaidSheet';
import { logPaid } from './logPaid';
import { usualOf } from '@/utils/incomeUsual';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui';
import StreamSheet from './components/StreamSheet';
import { styles } from './IncomeStreamsScreen.styles';

// One income source: what it paid this month, month by month, and each payment.
// Opened with id "new" (from the Add screen's source picker) it goes straight to the new-source sheet.
export default function StreamEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { showToast } = useToast();
  const { streams, loading } = useIncomeStreams();
  const { transactions: yearTx } = useTransactions('last12Months');
  const stream = isNew ? undefined : streams.find((s) => s.id === id);
  const [editing, setEditing] = useState(isNew);
  const [paying, setPaying] = useState(false);
  const { settings } = useSettings();
  const t = useEntrance(800, loading);

  const payments = useMemo(() => (isNew ? [] : yearTx.filter((x) => x.type === 'income' && x.streamId === id)), [yearTx, id, isNew]);
  const sum = (from: { start: Date; end: Date }) => payments.filter((x) => isInRange(x.date, from)).reduce((a, x) => a + x.amount, 0);
  const monthTotal = sum(getRange('month'));
  const yearTotal = sum(getRange('year'));
  const bars = useMemo(() => lastMonths(12).map((m) => ({ ...m, value: payments.filter((x) => isInRange(x.date, m)).reduce((a, x) => a + x.amount, 0) })), [payments]);
  const paid = bars.filter((b) => b.value > 0);
  const avg = paid.length ? Math.round(paid.reduce((a, b) => a + b.value, 0) / paid.length) : 0;
  const monthV = useTween(monthTotal);
  const expected = stream?.fixed ? stream.expectedMonthly : undefined;
  const usual = useMemo(() => usualOf(payments), [payments]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/income' as Href));

  const save = async (s: NewIncomeStream) => {
    try {
      if (isNew) await addIncomeStream(s);
      else await updateIncomeStream(id, s);
      showToast({ message: isNew ? `${s.name} added` : `${s.name} saved` });
      if (isNew) goBack();
      else setEditing(false);
    } catch (e) {
      console.error('Save stream failed:', e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };

  const remove = () => {
    if (!stream) return;
    const msg = 'Past income stays in your history. It just won’t be linked to a source.';
    const go = async () => {
      try {
        await deleteIncomeStream(stream.id);
        showToast({ message: `${stream.name} deleted` });
        goBack();
      } catch (e) {
        console.error('Delete stream failed:', e);
        showToast({ message: 'Couldn’t delete. Try again.' });
      }
    };
    if (Platform.OS === 'web') askWeb(`Delete ${stream.name}?\n\n${msg}`, 'Delete').then((y) => { if (y) go(); });
    else Alert.alert(`Delete ${stream.name}?`, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  if (isNew || !stream) {
    return (
      <>
        <Screen title={isNew ? 'New source' : loading ? 'Income' : 'Not found'} onBack={goBack}>
          {loading && !isNew ? <View style={[styles.skel, { height: 220 }]} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
            : !isNew ? <Text style={styles.muted}>This income source was deleted.</Text> : null}
        </Screen>
        {isNew && editing && <StreamSheet onClose={goBack} onSave={save} />}
      </>
    );
  }

  const color = streamColor(stream.type);
  return (
    <>
      <Screen title={stream.name} subtitle={streamTypeMeta(stream.type).label} onBack={goBack} right={<IconButton icon="create-outline" label="Edit source" onPress={() => setEditing(true)} />}>
        <View style={styles.hero}>
          <Text style={styles.label}>This month</Text>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(monthV))}</Text>
          {expected ? (
            <View style={{ gap: 2 }} accessible accessibilityLabel={`${formatINR(monthTotal)} of ${formatINR(expected)} expected`}>
              <Bullet value={monthTotal} limit={expected} color={Corpus.income} height={10} appear={t} />
              <Text style={styles.sub}>{monthTotal >= expected ? `All ${formatINR(expected)} has come in` : `${formatINR(expected - monthTotal)} of ${formatINR(expected)} still to come`}</Text>
            </View>
          ) : (
            <Text style={styles.sub}>{stateLine(stream, monthTotal, usual).text}</Text>
          )}
          <View style={styles.strip}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>This year</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatINR(yearTotal)}</Text>
            </View>
            <View style={styles.rule} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Usual month</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{avg ? formatINR(avg) : '–'}</Text>
            </View>
            <View style={styles.rule} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Last paid</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {payments[0] ? new Date(payments[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'}
              </Text>
            </View>
          </View>
        </View>

        <Button icon="add" label="Got paid" onPress={() => setPaying(true)} />

        {paid.length > 0 && (
          <View style={styles.hero}>
            <Text style={styles.label}>Last 12 months</Text>
            <MonthBars bars={bars} color={color} target={expected ?? (usual.months >= 2 ? usual.avg : undefined)} targetLabel={expected ? 'Expected' : 'Your average'} height={110} appear={t} />
          </View>
        )}

        <Group animate title="Payments">
          {payments.length === 0
            ? [<View key="none" style={{ padding: 16 }}><Text style={styles.muted}>Nothing yet. Tap “Got paid” when money comes in.</Text></View>]
            : payments.slice(0, 10).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: tx.id } })} />
              ))}
        </Group>
        {payments.length > 10 && <Text style={styles.foot}>And {payments.length - 10} older payments this year.</Text>}
      </Screen>
      {editing && <StreamSheet stream={stream} onClose={() => setEditing(false)} onSave={save} onDelete={remove} />}
      {paying && (
        <GotPaidSheet
          stream={stream}
          usual={usual}
          onClose={() => setPaying(false)}
          onSave={async (amount, date, note) => {
            try {
              await logPaid(stream, amount, date, note, settings.defaultAccountId);
              setPaying(false);
              showToast({ message: `${formatINR(amount)} from ${stream.name} added` });
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

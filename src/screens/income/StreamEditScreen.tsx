import { Button, ScreenHeader } from '@/components/ui';
import FilterChips, { ChipOption } from '@/components/FilterChips';
import { Corpus } from '@/constants/theme';
import { useIncomeStreams } from '@/hooks/useIncomeStreams';
import { useTransactions } from '@/hooks/useTransactions';
import TransactionRow from '@/screens/home/components/TransactionRow';
import { getRange, isInRange } from '@/utils/dates';
import { formatINR } from '@/utils/format';
import {
  addIncomeStream,
  deleteIncomeStream,
  updateIncomeStream,
} from '@/services/incomeStreams';
import { STREAM_TYPES, type StreamType } from '@/types/incomeStream';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './StreamEditScreen.styles';

const TYPE_OPTIONS: ChipOption<StreamType>[] = STREAM_TYPES.map((t) => ({ id: t.id, label: t.label }));

function notify(message: string) {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert('Corpus', message);
}

function confirmDelete(name: string, onConfirm: () => void) {
  const message = `Delete "${name}"? Past income stays in your history, just unlinked.`;
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Delete stream', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function StreamEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { streams, loading } = useIncomeStreams();
  const existing = isNew ? undefined : streams.find((s) => s.id === id);

  // Payments from this stream (this year, newest first)
  const { transactions: yearTx } = useTransactions('last12Months');
  const payments = isNew
    ? []
    : yearTx.filter((t) => t.type === 'income' && t.streamId === id);
  const monthRange = getRange('month');
  const monthTotal = payments
    .filter((t) => isInRange(t.date, monthRange))
    .reduce((sum, t) => sum + t.amount, 0);
  const yearRange = getRange('year');
  const yearTotal = payments
    .filter((t) => isInRange(t.date, yearRange))
    .reduce((sum, t) => sum + t.amount, 0);
  const shownPayments = payments.slice(0, 10);

  // Month-by-month totals for the last 12 months, newest first
  const now = new Date();
  const history = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = payments
      .filter((t) => isInRange(t.date, { start: monthStart, end: monthEnd }))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      total,
    };
  });
  // Bars measure against the expected amount, or the best month if none is set
  const barScale = Math.max(
    existing?.expectedMonthly ?? 0,
    ...history.map((h) => h.total),
    1
  );

  const [name, setName] = useState('');
  const [type, setType] = useState<StreamType>('salary');
  const [expected, setExpected] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fill the form once when editing an existing stream
  useEffect(() => {
    if (existing && !prefilled) {
      setName(existing.name);
      setType(existing.type);
      setExpected(existing.expectedMonthly ? String(existing.expectedMonthly) : '');
      setPrefilled(true);
    }
  }, [existing, prefilled]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/income' as Href));

  const expectedNumber = expected.trim() === '' ? undefined : Number(expected);
  const expectedInvalid =
    expectedNumber !== undefined && (!Number.isFinite(expectedNumber) || expectedNumber <= 0);
  const canSave = name.trim().length > 0 && !expectedInvalid && !busy;

  const handleSave = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const data = { name: name.trim(), type, expectedMonthly: expectedNumber };
      if (isNew) await addIncomeStream(data);
      else await updateIncomeStream(id, data);
      goBack();
    } catch (e) {
      console.error('Save stream failed:', e);
      notify('Could not save the stream. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmDelete(existing.name, async () => {
      setBusy(true);
      try {
        await deleteIncomeStream(existing.id);
        goBack();
      } catch (e) {
        console.error('Delete stream failed:', e);
        notify('Could not delete. Try again.');
      } finally {
        setBusy(false);
      }
    });
  };

  const header = (
    <ScreenHeader title={isNew ? 'New income stream' : 'Edit stream'} onBack={goBack} />
  );

  if (!isNew && (loading || (!existing && !prefilled))) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          {header}
          <View style={styles.center}>
            {loading ? (
              <ActivityIndicator color={Corpus.gold} />
            ) : (
              <Text style={styles.muted}>This stream no longer exists</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {header}

        {!isNew && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This month</Text>
                <Text style={styles.statValue}>{formatINR(monthTotal)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>This year</Text>
                <Text style={styles.statValue}>{formatINR(yearTotal)}</Text>
              </View>
            </View>

            <Text style={styles.label}>MONTHLY HISTORY</Text>
            <View style={styles.history}>
              {history.map((m) => (
                <View key={m.key} style={styles.historyRow}>
                  <Text style={styles.historyMonth}>{m.label}</Text>
                  <View style={styles.historyTrack}>
                    {m.total > 0 && (
                      <View
                        style={[
                          styles.historyFill,
                          { width: `${Math.min((m.total / barScale) * 100, 100)}%` },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.historyAmount, m.total === 0 && styles.historyNone]}>
                    {m.total > 0 ? formatINR(m.total) : '—'}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.label}>RECENT PAYMENTS</Text>
            {shownPayments.length === 0 ? (
              <Text style={styles.hint}>
                No payments linked yet. When you add income, choose this stream under FROM.
              </Text>
            ) : (
              <View style={styles.payments}>
                {shownPayments.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onPress={() => router.push({ pathname: '/edit/[id]', params: { id: tx.id } })}
                  />
                ))}
                {payments.length > shownPayments.length && (
                  <Text style={styles.hint}>
                    + {payments.length - shownPayments.length} older payments
                  </Text>
                )}
              </View>
            )}

            <Text style={[styles.label, styles.detailsLabel]}>DETAILS</Text>
          </>
        )}

        <Text style={styles.label}>NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={type === 'client' ? 'e.g. Zenith Studio' : 'e.g. Salary'}
          placeholderTextColor={Corpus.textFaint}
          maxLength={40}
          autoFocus={isNew}
        />

        <Text style={styles.label}>TYPE</Text>
        <FilterChips options={TYPE_OPTIONS} value={type} onChange={setType} />

        <Text style={styles.label}>EXPECTED PER MONTH (OPTIONAL)</Text>
        <View style={[styles.moneyRow, expectedInvalid && styles.inputError]}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.moneyInput}
            value={expected}
            onChangeText={setExpected}
            placeholder="e.g. 50000"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="numeric"
          />
        </View>
        {expectedInvalid ? (
          <Text style={styles.error}>Enter an amount greater than 0, or leave it empty</Text>
        ) : (
          <Text style={styles.hint}>Used to show how much of this month's income is still to come</Text>
        )}

        <Button label={isNew ? 'Add stream' : 'Save changes'} onPress={handleSave} loading={busy} disabled={!canSave} />

        {!isNew && (
          <Button variant="danger" icon="trash-outline" label="Delete stream" onPress={handleDelete} disabled={busy} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

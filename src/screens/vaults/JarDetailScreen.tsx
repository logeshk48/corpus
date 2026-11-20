import { Button, Group, IconButton, IconChip, Screen } from '@/components/ui';
import { askWeb } from '@/services/confirm';
import { Chip, Corpus } from '@/constants/theme';
import { useTween } from '@/hooks/useTween';
import LiquidJar from '@/components/charts/LiquidJar';
import { useToast } from '@/context/ToastContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { useInvestments } from '@/hooks/useInvestments';
import { updateInvestment } from '@/services/investments';
import { investMeta } from '@/types/investment';
import { savedOf } from '@/types/vault';
import { investForecast, jarsWithInvestments, linkedTo } from '@/utils/jarFunds';
import { compactINR } from '@/utils/format';
import { sipAmount } from '@/utils/sip';
import { formatYearMonth } from '@/utils/jarInsights';
import LinkInvestmentsSheet from './components/LinkInvestmentsSheet';
import { jarPlan, toYearMonth } from '@/utils/jarInsights';
import { planTooBig } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { averageMonthlyExpenses, recommendedEmergencyMonths } from '@/utils/jarInsights';
import { moneyMovedMessage } from './celebrate';
import JarInsights from './components/JarInsights';
import { addVaultEntry, deleteVault, deleteVaultEntry, updateVault } from '@/services/vaults';
import type { NewVault, VaultEntry, VaultEntryType } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import JarSheet, { type JarSheetMode } from './components/JarSheet';
import MoneySheet from './components/MoneySheet';
import { styles } from './JarDetailScreen.styles';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    askWeb(`Remove entry?\n\n${message}`, 'Remove').then((y) => { if (y) onYes(); });
  } else {
    Alert.alert('Remove entry', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onYes },
    ]);
  }
}

export default function JarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { vaults: cashJars, entries, loading } = useVaults();
  const { investments } = useInvestments();
  const vaults = jarsWithInvestments(cashJars, investments);
  const [linking, setLinking] = useState(false);
  const [moneyType, setMoneyType] = useState<VaultEntryType | null>(null);
  const [jarMode, setJarMode] = useState<JarSheetMode>(null);
  const { transactions: yearTx } = useTransactions('last12Months');
  const context = {
    avgExpenses: averageMonthlyExpenses(yearTx),
    recommendedMonths: recommendedEmergencyMonths(yearTx),
  };

  const jar = vaults.find((v) => v.id === id);
  const balV = useTween(jar ? savedOf(jar) : 0);
  const history = entries.filter((e) => e.vaultId === id); // newest first

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/vaults'));

  if (loading || !jar) {
    return (
      <Screen title={loading ? 'Jar' : 'Jar not found'} onBack={goBack}>
        {loading ? (
          <View style={[styles.skel, { height: 200 }]} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
        ) : (
          <Text style={styles.muted}>This jar was deleted.</Text>
        )}
      </Screen>
    );
  }

  const saved = savedOf(jar);
  const goalPercent = jar.goal ? Math.min((saved / jar.goal) * 100, 100) : 0;
  const reached = jar.goal !== undefined && saved >= jar.goal;
  const holdings = linkedTo(jar.id, investments);
  // Does this plan fit what you earn? Usual month = average of the months with income in the last year
  const byMonth = new Map<string, number>();
  for (const x of yearTx) if (x.type === 'income') byMonth.set(x.date.slice(0, 7), (byMonth.get(x.date.slice(0, 7)) ?? 0) + x.amount);
  const usualIncome = byMonth.size ? Math.round([...byMonth.values()].reduce((a, b) => a + b, 0) / byMonth.size) : 0;
  const plan = jarPlan(jar);
  const tooBig = !!plan && plan.status !== 'done' && planTooBig(plan.perMonth, usualIncome);
  // A date that fits: putting in about a quarter of a usual month's income
  const fitPerMonth = Math.max(500, Math.round((usualIncome * 0.25) / 100) * 100);
  const fitMonths = jar.goal ? Math.ceil(Math.max(0, jar.goal - saved) / fitPerMonth) : 0;
  const fitDate = toYearMonth(new Date(new Date().getFullYear(), new Date().getMonth() + fitMonths - 1, 1));
  const fits = fitMonths > 0 && fitMonths <= 480;
  const forecast = investForecast(jar, investments);

  const saveLinks = async (ids: string[]) => {
    try {
      await Promise.all(investments.map((h) => {
        const want = ids.includes(h.id);
        if (want && h.goalId !== jar.id) return updateInvestment(h.id, { goalId: jar.id });
        if (!want && h.goalId === jar.id) return updateInvestment(h.id, { goalId: undefined });
        return null;
      }));
      setLinking(false);
      showToast({ message: ids.length ? `${ids.length} investment${ids.length > 1 ? 's' : ''} linked to ${jar.name}` : 'Investments unlinked' });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };

  const moveMoney = async (amount: number, note?: string) => {
    if (!moneyType) return;
    try {
      await addVaultEntry({ vaultId: jar.id, type: moneyType, amount, note, date: new Date().toISOString() });
      setMoneyType(null);
      const msg = moneyMovedMessage(jar, moneyType, amount);
      showToast({ message: msg, celebrate: /Goal reached|% full/.test(msg) });
    } catch (e) {
      console.error('Move money failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const removeEntry = (entry: VaultEntry) => {
    // Removing a deposit must not push the balance below zero
    if (entry.type === 'in' && jar.balance - entry.amount < 0) {
      showToast({ message: 'Remove a later take-out first, or the balance goes below ₹0.' });
      return;
    }
    const label = entry.type === 'in' ? 'deposit' : 'withdrawal';
    confirm(`Remove this ${formatINR(entry.amount)} ${label}?`, async () => {
      try {
        await deleteVaultEntry(entry.id);
        const { id: _old, ...data } = entry;
        showToast({
          message: `${formatINR(entry.amount)} ${label} removed`,
          actionLabel: 'Undo',
          onAction: async () => {
            await addVaultEntry(data);
          },
        });
      } catch (e) {
        console.error('Remove entry failed:', e);
        showToast({ message: 'Could not remove. Try again.' });
      }
    });
  };

  const saveJar = async (vault: NewVault) => {
    try {
      await updateVault(jar.id, vault);
      setJarMode(null);
      showToast({ message: 'Jar updated' });
    } catch (e) {
      console.error('Update jar failed:', e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };

  const removeJar = async () => {
    try {
      await deleteVault(jar.id);
      setJarMode(null);
      showToast({ message: `${jar.name} jar deleted` });
      goBack();
    } catch (e) {
      console.error('Delete jar failed:', e);
      showToast({ message: 'Could not delete. Try again.' });
    }
  };

  return (
    <>
      <Screen title={jar.name} tone={jar.color} right={<IconButton icon="create-outline" label="Edit jar" onPress={() => setJarMode({ kind: 'edit', jar })} />} onBack={goBack}>
        <View style={styles.hero}>
          <LiquidJar level={jar.goal ? saved / jar.goal : saved > 0 ? 0.55 : 0} color={jar.color} width={120} height={156} marks={!!jar.goal} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={styles.heroLabel}>{jar.invested ? 'Saved for this goal' : 'In this jar'}</Text>
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(balV))}</Text>
            {jar.goal ? (
              <Text style={[styles.goalText, reached && { color: Corpus.income }]}>
                {reached ? `Goal of ${formatINR(jar.goal)} reached` : `${Math.round(goalPercent)}% of ${formatINR(jar.goal)}, ${formatINR(jar.goal - saved)} to go`}
              </Text>
            ) : (
              <Pressable onPress={() => setJarMode({ kind: 'edit', jar })} accessibilityRole="button" hitSlop={6}>
                <Text style={styles.goalText}>No goal yet. <Text style={styles.link}>Set one</Text></Text>
              </Pressable>
            )}
            {!!jar.invested && <Text style={styles.goalText}>{jar.balance > 0 ? `${compactINR(jar.balance)} cash, ` : ''}{compactINR(jar.invested)} invested</Text>}
          </View>
        </View>

        <View style={styles.actions}>
          <Button style={{ flex: 1 }} icon="add" label="Add money" tint={jar.color} tintText="black" onPress={() => setMoneyType('in')} />
          <Button style={{ flex: 1 }} variant="secondary" icon="remove" label="Take out" onPress={() => setMoneyType('out')} disabled={jar.balance <= 0} />
        </View>

        <Group title="Investments">
          {[
            ...holdings.map((h) => (
              <Pressable key={h.id} onPress={() => router.push('/invest')} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button">
                <IconChip icon={investMeta(h.type).icon.replace('-outline', '')} color={Chip.indigo} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.rowDate}>{h.sip?.active ? `SIP ${compactINR(sipAmount(h.sip, new Date()))} a month` : investMeta(h.type).label}</Text>
                </View>
                <Text style={styles.rowAmount}>{formatINR(Math.round(h.value))}</Text>
              </Pressable>
            )),
            <Pressable key="link" onPress={() => setLinking(true)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button">
              <IconChip icon={holdings.length ? 'swap-horizontal' : 'add'} color={Chip.gray} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{holdings.length ? 'Change linked investments' : 'Link an investment'}</Text>
                {!holdings.length && <Text style={styles.rowDate}>A fund, stocks or FD saving for this goal</Text>}
              </View>
            </Pressable>,
          ]}
        </Group>
        {forecast && (
          <Text style={[styles.foot, { color: forecast.onTrack ? Corpus.income : Corpus.textMuted }]}>
            {`With ${jar.sipMonthly ? `your ${compactINR(jar.sipMonthly)} a month in SIPs` : 'no SIP'} at about ${Math.round(forecast.rate)}% a year: around ${compactINR(forecast.projected)} by ${formatYearMonth(jar.targetDate!)}.${forecast.onTrack ? ' On track.' : ''}`}
          </Text>
        )}

        {tooBig && plan && (
          <View style={styles.warn}>
            <View style={styles.warnHead}>
              <Ionicons name="alert-circle" size={18} color={Corpus.warning} />
              <Text style={styles.warnTitle}>This plan doesn’t fit your income</Text>
            </View>
            <Text style={styles.warnText}>
              It needs {formatINR(plan.perMonth)} a month, and a usual month brings you about {formatINR(usualIncome)}. So it’s paused: Today doesn’t set this money aside.
              {fits ? ` Putting in ${formatINR(fitPerMonth)} a month gets you there by ${formatYearMonth(fitDate)}.` : ''}
            </Text>
            <View style={styles.actions}>
              {fits && (
                <Button style={{ flex: 1 }} size="sm" label={`Move to ${formatYearMonth(fitDate)}`} onPress={() => updateVault(jar.id, { targetDate: fitDate }).then(() => showToast({ message: `Target moved to ${formatYearMonth(fitDate)}` })).catch(() => showToast({ message: 'Couldn’t save. Try again.' }))} />
              )}
              <Button style={{ flex: 1 }} size="sm" variant="secondary" label="Change goal" onPress={() => setJarMode({ kind: 'edit', jar })} />
            </View>
          </View>
        )}

        <JarInsights jar={jar} entries={entries} context={context} onEdit={() => setJarMode({ kind: 'edit', jar })} />

        <Group animate title="History">
          {history.length === 0
            ? [<View key="none" style={styles.empty}><Text style={styles.muted}>No money moved yet</Text></View>]
            : history.map((e) => {
                const isIn = e.type === 'in';
                return (
                  <Pressable key={e.id} onPress={() => removeEntry(e)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole="button" accessibilityHint="Removes this entry">
                    <IconChip icon={isIn ? 'arrow-down' : 'arrow-up'} color={isIn ? jar.color : Chip.gray} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{e.note ?? (isIn ? 'Added' : 'Taken out')}</Text>
                      <Text style={styles.rowDate}>{new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <Text style={styles.rowAmount}>{isIn ? '+' : '−'}{formatINR(e.amount)}</Text>
                  </Pressable>
                );
              })}
        </Group>
        {history.length > 0 && <Text style={styles.foot}>Tap an entry to remove it.</Text>}
      </Screen>

      <MoneySheet jar={moneyType ? jar : null} type={moneyType ?? 'in'} onClose={() => setMoneyType(null)} onSubmit={moveMoney} />
      <JarSheet mode={jarMode} context={context} onClose={() => setJarMode(null)} onSave={saveJar} onDelete={removeJar} />
      {linking && <LinkInvestmentsSheet jar={jar} jars={vaults} list={investments} onClose={() => setLinking(false)} onSave={saveLinks} />}
    </>
  );
}

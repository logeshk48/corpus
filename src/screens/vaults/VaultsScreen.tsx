import Bullet from '@/components/charts/Bullet';
import Shine from '@/components/fx/Shine';
import { askWeb } from '@/services/confirm';
import { Button, IconChip, Screen } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { Chip, Corpus } from '@/constants/theme';
import { useTween } from '@/hooks/useTween';
import { useEntrance } from '@/hooks/useEntrance';
import { useToast } from '@/context/ToastContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { useGoalsToJars } from '@/hooks/useGoalsToJars';
import { jarsWithInvestments, unlinkedOf } from '@/utils/jarFunds';
import { addVault, addVaultEntry, deleteVault, mergeVaults, updateVault } from '@/services/vaults';
import { updateInvestment } from '@/services/investments';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import JarPickerSheet from './components/JarPickerSheet';
import { savedOf, STARTER_VAULTS, type NewVault, type VaultEntryType, type VaultWithBalance } from '@/types/vault';
import { compactINR, formatINR } from '@/utils/format';
import {
  averageMonthlyExpenses,
  jarPlan,
  recommendedEmergencyMonths,
  savingStreak,
} from '@/utils/jarInsights';
import { suggestJarTip } from '@/utils/jarTips';
import { moneyMovedMessage } from './celebrate';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import JarTile from './components/JarTile';
import Animated, { FadeInDown } from 'react-native-reanimated';
import JarSheet, { type JarSheetMode } from './components/JarSheet';
import MoneySheet from './components/MoneySheet';
import StarterJars from './components/StarterJars';
import { styles } from './VaultsScreen.styles';

type MoneyMode = { jarId: string; type: VaultEntryType; amount?: number } | null;

export default function VaultsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { vaults: cashJars, entries, total: cashTotal, addedThisMonth, loading } = useVaults();
  const { investments, loading: invLoading } = useInvestments();
  const { settings, loading: setLoading } = useSettings();
  useGoalsToJars(settings.investGoals, investments, !loading && !invLoading && !setLoading);
  const vaults = jarsWithInvestments(cashJars, investments);
  // Every investment counts in the total: the ones in a jar and the ones not sorted yet
  const loose = unlinkedOf(investments, vaults);
  const looseValue = Math.round(loose.reduce((a, h) => a + h.value, 0));
  const invested = vaults.reduce((a, v) => a + (v.invested ?? 0), 0) + looseValue;
  const total = cashTotal + invested;
  const [sorting, setSorting] = useState(false);
  const [gridW, setGridW] = useState(0);
  // Two jars with the same name (e.g. two Savings) → offer to merge
  const dup = (() => {
    const seen = new Map<string, (typeof vaults)[number]>();
    for (const v of vaults) {
      const k = v.name.trim().toLowerCase();
      if (seen.has(k)) return { keep: seen.get(k)!, drop: v };
      seen.set(k, v);
    }
    return null;
  })();
  const { transactions: monthTx } = useTransactions('month');
  const { transactions: yearTx } = useTransactions('last12Months');

  // Context for smart insights
  const context = {
    avgExpenses: averageMonthlyExpenses(yearTx),
    recommendedMonths: recommendedEmergencyMonths(yearTx),
  };
  const streak = savingStreak(entries);

  // This month's plan across every jar that has a goal + target date
  let planTotal = 0;
  let planDone = 0;
  for (const v of vaults) {
    const p = jarPlan(v);
    if (!p || p.status === 'done' || p.status === 'overdue') continue;
    planTotal += p.perMonth;
    planDone += Math.min(p.addedThisMonth, p.perMonth);
  }
  const [money, setMoney] = useState<MoneyMode>(null);
  const [jarMode, setJarMode] = useState<JarSheetMode>(null);
  const [dismissedTip, setDismissedTip] = useState<string | null>(null);

  const moneyJar = money ? vaults.find((v) => v.id === money.jarId) ?? null : null;
  const tip = suggestJarTip(monthTx, vaults, entries);
  const showTip = tip && tip.income.id !== dismissedTip;

  const totalV = useTween(loading ? 0 : total);
  const t = useEntrance(800, loading);

  const createJar = async (vault: NewVault) => {
    try {
      await addVault(vault);
      setJarMode(null);
      showToast({ message: `${vault.name} jar created` });
    } catch (e) {
      console.error('Create jar failed:', e);
      showToast({ message: 'Could not create the jar. Try again.' });
    }
  };

  const saveJar = async (vault: NewVault) => {
    if (jarMode?.kind === 'edit') {
      try {
        await updateVault(jarMode.jar.id, vault);
        setJarMode(null);
        showToast({ message: 'Jar updated' });
      } catch (e) {
        console.error('Update jar failed:', e);
        showToast({ message: 'Could not save. Try again.' });
      }
    } else {
      await createJar(vault);
    }
  };

  const removeJar = async (jar: VaultWithBalance) => {
    try {
      await deleteVault(jar.id);
      setJarMode(null);
      showToast({ message: `${jar.name} jar deleted` });
    } catch (e) {
      console.error('Delete jar failed:', e);
      showToast({ message: 'Could not delete. Try again.' });
    }
  };

  const moveMoney = async (amount: number, note?: string) => {
    if (!money || !moneyJar) return;
    const type = money.type;
    try {
      await addVaultEntry({ vaultId: moneyJar.id, type, amount, note, date: new Date().toISOString() });
      setMoney(null);
      const msg = moneyMovedMessage(moneyJar, type, amount);
      showToast({ message: msg, celebrate: /Goal reached|% full/.test(msg) });
    } catch (e) {
      console.error('Move money failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const sortInto = async (picks: { id: string; jarId: string | null }[]) => {
    try {
      const moves = picks.filter((p) => p.jarId);
      await Promise.all(moves.map((p) => updateInvestment(p.id, { goalId: p.jarId! })));
      setSorting(false);
      showToast({ message: moves.length ? `${moves.length} investment${moves.length > 1 ? 's' : ''} put in jars` : 'Left as they are' });
    } catch (e) {
      console.error(e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };

  const merge = () => {
    if (!dup) return;
    const msg = dup.drop.balance > 0 || (dup.drop.invested ?? 0) > 0
      ? `${formatINR(savedOf(dup.drop))} and its history move into the other ${dup.keep.name} jar. Nothing is lost.`
      : `One of them is empty, so it’s removed. Nothing is lost.`;
    const go = () => mergeVaults(dup.drop.id, dup.keep.id).then(() => showToast({ message: `Merged into one ${dup.keep.name} jar` })).catch(() => showToast({ message: 'Couldn’t merge. Try again.' }));
    if (Platform.OS === 'web') askWeb(`Merge the two ${dup.keep.name} jars?\n\n${msg}`, 'Merge', false).then((y) => { if (y) go(); });
    else Alert.alert(`Merge the two ${dup.keep.name} jars?`, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Merge', onPress: go }]);
  };

  const incomeName = (t: NonNullable<typeof tip>['income']) =>
    t.note ?? findCategory(t.type, t.category)?.label ?? 'income';

  return (
    <>
      <Screen
        title="Jars"
        subtitle="One goal each: cash and investments"
        right={vaults.length > 0 ? <Button size="sm" icon="add" label="New jar" onPress={() => setJarMode({ kind: 'new' })} /> : undefined}
      >
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading jars" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 150 }]} />
            <View style={[styles.skel, { height: 220 }]} />
          </View>
        ) : vaults.length === 0 ? (
          <>
            <Text style={styles.lead}>A jar keeps money apart for one thing: tax, an emergency, a trip. Add when you can, take out when you need it.</Text>
            <StarterJars existingNames={[]} onCreate={createJar} onCustom={() => setJarMode({ kind: 'new' })} />
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Shine />
              <Text style={styles.heroLabel}>Saved for your goals</Text>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{formatINR(Math.round(totalV))}</Text>
              <View style={styles.heroLine}>
                <Text style={styles.heroSub}>
                  {invested > 0 ? `${compactINR(cashTotal)} cash, ${compactINR(invested)} invested. ` : ''}
                  {addedThisMonth > 0 ? `${formatINR(addedThisMonth)} added this month` : 'Nothing added this month yet'}
                </Text>
                {streak > 0 && (
                  <View style={styles.streak} accessibilityLabel={`${streak} month saving streak`}>
                    <Ionicons name="flame" size={13} color={Chip.orange} />
                    <Text style={styles.streakText}>{streak}-month streak</Text>
                  </View>
                )}
              </View>

              {planTotal > 0 && (
                <View style={styles.plan} accessible accessibilityLabel={`This month's plan: ${formatINR(planDone)} of ${formatINR(planTotal)}`}>
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>This month’s plan</Text>
                    <Text style={styles.planValue}>{formatINR(planDone)} of {formatINR(planTotal)}</Text>
                  </View>
                  <Bullet value={planDone} limit={planTotal} color={planDone >= planTotal ? Corpus.income : Corpus.text} height={10} appear={t} />
                  <Text style={styles.planHint}>
                    {planDone >= planTotal ? 'Every goal is on schedule this month' : `${formatINR(planTotal - planDone)} more keeps every goal on schedule`}
                  </Text>
                </View>
              )}
            </View>

            {showTip && tip && (
              <View style={styles.tip}>
                <IconChip icon="arrow-down" color={Chip.green} size={34} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.tipText}>
                    {formatINR(tip.income.amount)} came in from {incomeName(tip.income)}. Put {formatINR(tip.amount)} ({tip.percent}%) in {tip.jar.name}?
                  </Text>
                  <View style={styles.tipActions}>
                    <Button size="sm" label={`Add ${formatINR(tip.amount)}`} onPress={() => setMoney({ jarId: tip.jar.id, type: 'in', amount: tip.amount })} />
                    <Button size="sm" variant="secondary" label="Not now" onPress={() => setDismissedTip(tip.income.id)} />
                  </View>
                </View>
              </View>
            )}

            <View style={{ gap: 10 }}>
              <Text style={styles.section} accessibilityRole="header">Your jars</Text>
              <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
                {gridW > 0 && vaults.map((jar, i) => (
                  <Animated.View key={jar.id} entering={FadeInDown.delay(80 + i * 70).duration(380)}>
                    <JarTile jar={jar} width={(gridW - 12) / 2} onOpen={() => router.push({ pathname: '/vault/[id]', params: { id: jar.id } })} onAdd={() => setMoney({ jarId: jar.id, type: 'in' })} />
                  </Animated.View>
                ))}
              </View>
            </View>
            {loose.length > 0 && (
              <Pressable onPress={() => setSorting(true)} style={({ pressed }) => [styles.looseCard, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityHint="Choose a jar for each investment">
                <IconChip icon="layers" color={Chip.indigo} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.looseTitle}>Not in a jar yet</Text>
                  <Text style={styles.looseSub}>{loose.length} investment{loose.length > 1 ? 's' : ''} worth {formatINR(looseValue)}</Text>
                </View>
                <View style={styles.sortBtn}><Text style={styles.sortText}>Sort</Text></View>
              </Pressable>
            )}
            {dup && (
              <Pressable onPress={merge} style={({ pressed }) => [styles.dup, pressed && { opacity: 0.8 }]} accessibilityRole="button">
                <Ionicons name="git-merge" size={18} color={Corpus.warning} />
                <Text style={styles.dupText}>You have two jars called {dup.keep.name}</Text>
                <Text style={styles.dupAction}>Merge</Text>
              </Pressable>
            )}

            {STARTER_VAULTS.some((s) => !vaults.some((v) => v.name.toLowerCase() === s.name.toLowerCase())) && (
              <StarterJars compact existingNames={vaults.map((v) => v.name)} onCreate={createJar} onCustom={() => setJarMode({ kind: 'new' })} />
            )}
          </>
        )}
      </Screen>

      <MoneySheet jar={moneyJar} type={money?.type ?? 'in'} initialAmount={money?.amount} onClose={() => setMoney(null)} onSubmit={moveMoney} />
      <JarSheet mode={jarMode} context={context} onClose={() => setJarMode(null)} onSave={saveJar} onDelete={removeJar} />
      {sorting && <JarPickerSheet holdings={loose} jars={cashJars} onClose={() => setSorting(false)} onSave={sortInto} onNewJar={() => { setSorting(false); setJarMode({ kind: 'new' }); }} />}
    </>
  );
}

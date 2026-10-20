import { findCategory } from '@/constants/categories';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { addVault, addVaultEntry, deleteVault, updateVault } from '@/services/vaults';
import { STARTER_VAULTS, type NewVault, type VaultEntryType, type VaultWithBalance } from '@/types/vault';
import { formatINR } from '@/utils/format';
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
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JarCard from './components/JarCard';
import JarSheet, { type JarSheetMode } from './components/JarSheet';
import MoneySheet from './components/MoneySheet';
import StarterJars from './components/StarterJars';
import { styles } from './VaultsScreen.styles';

type MoneyMode = { jarId: string; type: VaultEntryType; amount?: number } | null;

export default function VaultsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { vaults, entries, total, addedThisMonth, loading } = useVaults();
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

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
      showToast({ message: moneyMovedMessage(moneyJar, type, amount) });
    } catch (e) {
      console.error('Move money failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const incomeName = (t: NonNullable<typeof tip>['income']) =>
    t.note ?? findCategory(t.type, t.category)?.label ?? 'income';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Corpus.text} />
          </Pressable>
          <Text style={styles.heading}>Vaults</Text>
          {vaults.length > 0 && (
            <Pressable style={styles.newButton} onPress={() => setJarMode({ kind: 'new' })}>
              <Ionicons name="add" size={14} color="#0F1115" />
              <Text style={styles.newText}>New jar</Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Corpus.gold} />
          </View>
        ) : vaults.length === 0 ? (
          <StarterJars
            existingNames={[]}
            onCreate={createJar}
            onCustom={() => setJarMode({ kind: 'new' })}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>MONEY IN YOUR JARS</Text>
              <Text style={styles.heroAmount}>{formatINR(total)}</Text>
              <Text style={styles.heroSub}>
                {addedThisMonth > 0
                  ? `+${formatINR(addedThisMonth)} added this month`
                  : `${vaults.length} jar${vaults.length === 1 ? '' : 's'} · nothing added this month yet`}
              </Text>

              {streak > 0 && (
                <View style={styles.streak}>
                  <Text style={styles.streakText}>
                    🔥 {streak}-month saving streak{streak >= 3 ? ' — brilliant!' : ''}
                  </Text>
                </View>
              )}

              {planTotal > 0 && (
                <View style={styles.plan}>
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>This month's plan</Text>
                    <Text style={styles.planValue}>
                      {formatINR(planDone)} of {formatINR(planTotal)}
                    </Text>
                  </View>
                  <View style={styles.planTrack}>
                    <View
                      style={[styles.planFill, { width: `${Math.min((planDone / planTotal) * 100, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.planHint}>
                    {planDone >= planTotal
                      ? '✓ Every goal is on track this month'
                      : `${formatINR(planTotal - planDone)} more keeps all your goals on schedule`}
                  </Text>
                </View>
              )}
            </View>

            {showTip && tip && (
              <View style={styles.tip}>
                <View style={styles.tipTop}>
                  <Ionicons name="sparkles" size={16} color={Corpus.gold} />
                  <Text style={styles.tipText}>
                    You received {formatINR(tip.income.amount)} from {incomeName(tip.income)}.{' '}
                    <Text style={styles.tipMuted}>
                      Put {formatINR(tip.amount)} ({tip.percent}%) in {tip.jar.name}?
                    </Text>
                  </Text>
                </View>
                <View style={styles.tipActions}>
                  <Pressable style={styles.tipLater} onPress={() => setDismissedTip(tip.income.id)}>
                    <Text style={styles.tipLaterText}>Not now</Text>
                  </Pressable>
                  <Pressable
                    style={styles.tipAdd}
                    onPress={() => setMoney({ jarId: tip.jar.id, type: 'in', amount: tip.amount })}
                  >
                    <Text style={styles.tipAddText}>Add {formatINR(tip.amount)}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.list}>
              {vaults.map((jar) => (
                <JarCard
                  key={jar.id}
                  jar={jar}
                  context={context}
                  onOpen={() => router.push({ pathname: '/vault/[id]', params: { id: jar.id } })}
                  onAdd={() => setMoney({ jarId: jar.id, type: 'in' })}
                  onTakeOut={() => setMoney({ jarId: jar.id, type: 'out' })}
                />
              ))}
            </View>

            {STARTER_VAULTS.some(
              (s) => !vaults.some((v) => v.name.toLowerCase() === s.name.toLowerCase())
            ) && (
              <>
                <Text style={styles.suggestLabel}>SUGGESTED JARS</Text>
                <StarterJars
                  compact
                  existingNames={vaults.map((v) => v.name)}
                  onCreate={createJar}
                  onCustom={() => setJarMode({ kind: 'new' })}
                />
              </>
            )}

            <Pressable style={styles.another} onPress={() => setJarMode({ kind: 'new' })}>
              <Ionicons name="add-circle-outline" size={16} color={Corpus.gold} />
              <Text style={styles.anotherText}>Create another jar</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <MoneySheet
        jar={moneyJar}
        type={money?.type ?? 'in'}
        initialAmount={money?.amount}
        onClose={() => setMoney(null)}
        onSubmit={moveMoney}
      />
      <JarSheet
        mode={jarMode}
        context={context}
        onClose={() => setJarMode(null)}
        onSave={saveJar}
        onDelete={removeJar}
      />
    </SafeAreaView>
  );
}

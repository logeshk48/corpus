import { IconButton, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { averageMonthlyExpenses, recommendedEmergencyMonths } from '@/utils/jarInsights';
import { moneyMovedMessage } from './celebrate';
import JarInsights from './components/JarInsights';
import { addVaultEntry, deleteVault, deleteVaultEntry, updateVault } from '@/services/vaults';
import type { NewVault, VaultEntry, VaultEntryType } from '@/types/vault';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import JarSheet, { type JarSheetMode } from './components/JarSheet';
import MoneySheet from './components/MoneySheet';
import { styles } from './JarDetailScreen.styles';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
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
  const { vaults, entries, loading } = useVaults();
  const [moneyType, setMoneyType] = useState<VaultEntryType | null>(null);
  const [jarMode, setJarMode] = useState<JarSheetMode>(null);
  const { transactions: yearTx } = useTransactions('last12Months');
  const context = {
    avgExpenses: averageMonthlyExpenses(yearTx),
    recommendedMonths: recommendedEmergencyMonths(yearTx),
  };

  const jar = vaults.find((v) => v.id === id);
  const history = entries.filter((e) => e.vaultId === id); // newest first

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/vaults'));

  if (loading || !jar) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <ScreenHeader onBack={goBack} />
          <View style={styles.center}>
            {loading ? (
              <ActivityIndicator color={Corpus.gold} />
            ) : (
              <Text style={styles.muted}>This jar no longer exists</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const goalPercent = jar.goal ? Math.min((jar.balance / jar.goal) * 100, 100) : 0;
  const reached = jar.goal !== undefined && jar.balance >= jar.goal;

  const moveMoney = async (amount: number, note?: string) => {
    if (!moneyType) return;
    try {
      await addVaultEntry({ vaultId: jar.id, type: moneyType, amount, note, date: new Date().toISOString() });
      setMoneyType(null);
      showToast({ message: moneyMovedMessage(jar, moneyType, amount) });
    } catch (e) {
      console.error('Move money failed:', e);
      showToast({ message: 'Could not save. Check your connection.' });
    }
  };

  const removeEntry = (entry: VaultEntry) => {
    // Removing a deposit must not push the balance below zero
    if (entry.type === 'in' && jar.balance - entry.amount < 0) {
      showToast({ message: 'Remove a later take-out first — the balance would go below ₹0.' });
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={jar.name} right={<IconButton icon="create-outline" label="Edit" onPress={() => setJarMode({ kind: 'edit', jar })} />} onBack={goBack} />

        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: `${jar.color}26` }]}>
            <Ionicons name={jar.icon as any} size={26} color={jar.color} />
          </View>
          <Text style={styles.heroLabel}>IN THIS JAR</Text>
          <Text style={[styles.heroAmount, { color: jar.color }]}>{formatINR(jar.balance)}</Text>
          {jar.goal ? (
            <View style={styles.goalWrap}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${goalPercent}%`, backgroundColor: jar.color }]} />
              </View>
              <Text style={[styles.goalText, reached && { color: Corpus.income }]}>
                {reached
                  ? `🎉 You reached your ${formatINR(jar.goal)} goal`
                  : `${Math.round(goalPercent)}% of ${formatINR(jar.goal)} · ${formatINR(jar.goal - jar.balance)} to go`}
              </Text>
            </View>
          ) : (
            <Text style={styles.goalText}>No goal set · tap ✎ to add one</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.addButton, { backgroundColor: jar.color }]} onPress={() => setMoneyType('in')}>
            <Ionicons name="add" size={17} color={Corpus.onGold} />
            <Text style={styles.addText}>Add money</Text>
          </Pressable>
          <Pressable
            style={[styles.outButton, jar.balance <= 0 && { opacity: 0.4 }]}
            onPress={() => setMoneyType('out')}
            disabled={jar.balance <= 0}
          >
            <Ionicons name="remove" size={17} color={Corpus.text} />
            <Text style={styles.outText}>Take out</Text>
          </Pressable>
        </View>

        <JarInsights
          jar={jar}
          entries={entries}
          context={context}
          onEdit={() => setJarMode({ kind: 'edit', jar })}
        />

        <SectionLabel right={history.length > 0 ? "Tap an entry to remove it" : undefined}>HISTORY</SectionLabel>
        <View style={styles.group}>
          {history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={26} color={Corpus.textFaint} />
              <Text style={styles.emptyText}>No money moved yet</Text>
            </View>
          ) : (
            history.map((e, i) => {
              const isIn = e.type === 'in';
              return (
                <Pressable
                  key={e.id}
                  onPress={() => removeEntry(e)}
                  style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && styles.pressed]}
                >
                  <Ionicons
                    name={isIn ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={24}
                    color={isIn ? jar.color : Corpus.textMuted}
                  />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{e.note ?? (isIn ? 'Added' : 'Taken out')}</Text>
                    <Text style={styles.rowDate}>
                      {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: isIn ? jar.color : Corpus.text }]}>
                    {isIn ? '+' : '−'}{formatINR(e.amount)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <MoneySheet
        jar={moneyType ? jar : null}
        type={moneyType ?? 'in'}
        onClose={() => setMoneyType(null)}
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

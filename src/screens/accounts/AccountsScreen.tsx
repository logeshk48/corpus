import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { addAccount, deleteAccount, updateAccount } from '@/services/accounts';
import { saveSettings } from '@/services/settings';
import { accountTypeMeta, type NewAccount } from '@/types/account';
import { accountBalances, accountTotals, unassignedCount, type AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AccountSheet from './AccountSheet';
import { styles } from './AccountsScreen.styles';

const STARTERS: NewAccount[] = [
  { name: 'Cash', type: 'cash', opening: 0, openingDate: '' },
  { name: 'Bank account', type: 'bank', opening: 0, openingDate: '' },
];

export default function AccountsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { accounts, loading } = useAccounts();
  const { settings } = useSettings();
  const { transactions } = useTransactions('last12Months');
  const [sheet, setSheet] = useState<{ editing?: AccountBalance } | null>(null);

  const list = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const totals = accountTotals(list);
  const unlinked = unassignedCount(transactions, accounts);

  const save = async (a: NewAccount, makeDefault: boolean) => {
    try {
      const id = sheet?.editing ? (await updateAccount(sheet.editing.id, a), sheet.editing.id) : await addAccount(a);
      if (makeDefault && settings.defaultAccountId !== id) await saveSettings({ defaultAccountId: id });
      if (!makeDefault && settings.defaultAccountId === id) await saveSettings({ defaultAccountId: undefined });
      showToast({ message: sheet?.editing ? 'Account updated' : `${a.name} added` });
      setSheet(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };

  const remove = (a: AccountBalance) => {
    const go = async () => {
      await deleteAccount(a.id);
      if (settings.defaultAccountId === a.id) await saveSettings({ defaultAccountId: undefined });
      setSheet(null);
      showToast({ message: `${a.name} deleted. Its entries stay in your history` });
    };
    const msg = 'Your expenses and income stay. They just won’t be linked to this account.';
    if (Platform.OS === 'web') window.confirm(`Delete ${a.name}?\n\n${msg}`) && go();
    else Alert.alert(`Delete ${a.name}?`, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  const addStarters = async () => {
    const now = new Date().toISOString();
    await Promise.all(STARTERS.map((s) => addAccount({ ...s, openingDate: now })));
    showToast({ message: 'Cash and Bank added. Tap each to set its balance' });
  };

  const renderAccount = (a: AccountBalance) => {
    const credit = a.type === 'credit';
    const used = credit && a.creditLimit ? Math.min(100, Math.round((Math.max(0, a.balance) / a.creditLimit) * 100)) : 0;
    const color = credit ? (a.balance > 0 ? Corpus.warning : Corpus.text) : a.balance < 0 ? Corpus.danger : Corpus.text;
    return (
      <Pressable key={a.id} style={styles.card} onPress={() => setSheet({ editing: a })}>
        <View style={styles.top}>
          <View style={styles.icon}>
            <Ionicons name={accountTypeMeta(a.type).icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>
              {a.name} {settings.defaultAccountId === a.id ? <Text style={{ color: Corpus.gold }}>★</Text> : null}
            </Text>
            <Text style={styles.meta}>
              {credit
                ? [a.statementDay ? `Bill on ${a.statementDay}th` : '', a.dueDay ? `due ${a.dueDay}th` : ''].filter(Boolean).join(' · ') || 'Credit card'
                : a.monthIn || a.monthOut
                  ? `This month: +${formatINR(a.monthIn)} · −${formatINR(a.monthOut)}`
                  : accountTypeMeta(a.type).label}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.balance, { color }]}>{formatINR(Math.abs(a.balance))}</Text>
            <Text style={styles.meta}>{credit ? (a.balance > 0 ? 'owed' : 'nothing owed') : a.balance < 0 ? 'overdrawn' : 'balance'}</Text>
          </View>
        </View>
        {credit && a.creditLimit ? (
          <>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${used}%`, backgroundColor: used > 30 ? Corpus.warning : Corpus.income }]} />
            </View>
            <Text style={styles.note}>
              {used}% of {formatINR(a.creditLimit)} limit used{used > 30 ? ' · keeping it under 30% helps your credit score' : ''}
            </Text>
          </>
        ) : null}
      </Pressable>
    );
  };

  const money = list.filter((a) => a.type !== 'credit');
  const cards = list.filter((a) => a.type === 'credit');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Accounts"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          right={<Button size="sm" icon="add" label="Add" onPress={() => setSheet({})} />}
        />

        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : list.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>🏦</Text>
            <Text style={styles.emptyTitle}>Where is your money?</Text>
            <Text style={styles.emptyText}>
              Add your cash, bank account, wallet and credit cards. When you log an expense, pick where it was paid from, and every balance stays up to date.
            </Text>
            <Button label="Start with Cash + Bank" icon="flash" onPress={addStarters} style={{ alignSelf: 'stretch', marginTop: 12 }} />
            <Button variant="secondary" label="Add one myself" onPress={() => setSheet({})} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>MONEY YOU HAVE</Text>
              <Text style={[styles.heroValue, totals.have < 0 && { color: Corpus.danger }]}>{formatINR(totals.have)}</Text>
              {totals.cardDues > 0 && (
                <Text style={styles.heroSub}>
                  {formatINR(totals.cardDues)} owed on cards · {formatINR(totals.net)} after paying them
                </Text>
              )}
            </View>

            {money.length > 0 && <SectionLabel right="Tap to edit or correct">CASH & BANK</SectionLabel>}
            {money.map(renderAccount)}
            {cards.length > 0 && <SectionLabel>CREDIT CARDS</SectionLabel>}
            {cards.map(renderAccount)}

            {unlinked > 0 && (
              <Text style={styles.note}>
                ℹ️ {unlinked} older entr{unlinked === 1 ? 'y isn’t' : 'ies aren’t'} linked to an account, so they don’t change these balances. New entries ask “Paid from”.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {sheet && (
        <AccountSheet
          editing={sheet.editing}
          isDefault={!!sheet.editing && settings.defaultAccountId === sheet.editing.id}
          onClose={() => setSheet(null)}
          onSave={save}
          onDelete={sheet.editing ? () => remove(sheet.editing!) : undefined}
        />
      )}
    </SafeAreaView>
  );
}

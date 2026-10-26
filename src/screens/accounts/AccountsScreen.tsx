import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { addAccount, checkIn, deleteAccount, updateAccount } from '@/services/accounts';
import UpdateBalancesSheet from './UpdateBalancesSheet';
import { useIous } from '@/hooks/useIous';
import { useBills } from '@/hooks/useBills';
import { cardHealth, moneyHealth } from '@/utils/moneyHealth';
import { addCheckinTotal, gapMatters, reconcile } from '@/utils/reconcile';
import type { Href } from 'expo-router';
import { saveSettings } from '@/services/settings';
import { accountTypeMeta, type NewAccount } from '@/types/account';
import { accountBalances, accountTotals, nextCardDue, verifiedAgo, type AccountBalance } from '@/utils/accounts';
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
  const [updating, setUpdating] = useState(false);
  const { ious } = useIous();
  const { bills } = useBills();
  const ct = settings.checkinTotals ?? [];
  const recon = useMemo(
    () => (ct.length >= 2 ? reconcile(ct[ct.length - 2], ct[ct.length - 1], transactions, ious) : null),
    [ct, transactions, ious]
  );

  const list = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const totals = accountTotals(list);
  const health = useMemo(() => moneyHealth(totals.have, totals.cardDues, bills, transactions), [totals.have, totals.cardDues, bills, transactions]);

  const save = async (a: NewAccount, makeDefault: boolean, newBalance: number) => {
    try {
      const ed = sheet?.editing;
      const id = ed ? (await updateAccount(ed.id, a), ed.id) : await addAccount(a);
      if (ed && newBalance !== ed.balance) await checkIn({ ...ed, ...a }, newBalance);
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

  const saveAll = async (values: { account: AccountBalance; balance: number }[]) => {
    try {
      await Promise.all(values.map((v) => checkIn(v.account, v.balance)));
      const net = values.reduce((s, v) => s + (v.account.type === 'credit' ? -Math.max(0, v.balance) : v.balance), 0);
      await saveSettings({ checkinTotals: addCheckinTotal(settings.checkinTotals, net) });
      showToast({ message: 'All balances verified ✓' });
      setUpdating(false);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Could not save. Try again.' });
    }
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
            <Text style={[styles.meta, verifiedAgo(a).stale && { color: Corpus.warning }]}>
              {verifiedAgo(a).label}
              {credit && nextCardDue(a)
                ? ` · bill due ${nextCardDue(a)!.due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${nextCardDue(a)!.daysLeft <= 3 ? ` (${nextCardDue(a)!.daysLeft === 0 ? 'today' : `${nextCardDue(a)!.daysLeft}d`})` : ''}`
                : ''}
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
        {credit && a.balance > 0 && (
          <Text style={styles.note}>
            Pay the full {formatINR(a.balance)}. Paying only the minimum costs about {formatINR(cardHealth(a.balance, a.creditLimit).monthlyInterestIfUnpaid)} a month in interest (~42% a year)
          </Text>
        )}
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

            {ct.length >= 2 && (
              <View style={styles.trend}>
                {ct.slice(-12).map((c, k, arr) => {
                  const max = Math.max(...arr.map((x) => Math.abs(x.net)), 1);
                  return (
                    <View key={c.date} style={styles.trendCol}>
                      <View style={[styles.trendBar, { height: Math.max(3, (Math.abs(c.net) / max) * 44), backgroundColor: c.net < 0 ? Corpus.danger : k === arr.length - 1 ? Corpus.gold : Corpus.cardAlt }]} />
                      <Text style={styles.trendLabel}>{new Date(c.date).getDate()}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={[styles.card, health.short && { borderColor: Corpus.dangerLine, borderWidth: 1 }]}>
              <Text style={styles.name}>
                {health.short ? `⚠️ ${formatINR(-health.free)} short for what’s due` : `${formatINR(health.free)} actually free`}
              </Text>
              <Text style={styles.meta}>
                {formatINR(health.have)} you have
                {health.billsDue ? ` − ${formatINR(health.billsDue)} bills due in 30 days` : ''}
                {health.cardDues ? ` − ${formatINR(health.cardDues)} card dues` : ''}
              </Text>
              {health.runwayDays !== null && (
                <Text style={styles.meta}>
                  At your usual {formatINR(health.perDay)}/day, your money lasts about <Text style={{ color: health.runwayDays < 15 ? Corpus.warning : Corpus.text, fontWeight: '600' }}>{health.runwayDays} days</Text>
                </Text>
              )}
              {health.idle > 0 && (
                <Text style={[styles.meta, { color: Corpus.goldSoft }]}>
                  💡 {formatINR(health.idle)} is sitting idle beyond a 3-month safety buffer ({formatINR(health.monthly)}/month). Consider a jar, FD or investing it
                </Text>
              )}
            </View>

            <Button
              label={list.some((a) => verifiedAgo(a).stale) ? 'Update balances · some are old' : 'Update balances'}
              icon="refresh"
              variant={list.some((a) => verifiedAgo(a).stale) ? 'primary' : 'secondary'}
              onPress={() => setUpdating(true)}
            />

            {money.length > 0 && <SectionLabel right="Tap to edit">CASH & BANK</SectionLabel>}
            {money.map(renderAccount)}
            {cards.length > 0 && <SectionLabel>CREDIT CARDS</SectionLabel>}
            {cards.map(renderAccount)}

            {recon && (
              <View style={[styles.card, gapMatters(recon) && { borderColor: recon.gap < 0 ? Corpus.warningLine : Corpus.incomeLine, borderWidth: 1 }]}>
                <Text style={styles.name}>
                  {gapMatters(recon)
                    ? recon.gap < 0
                      ? `🔍 ${formatINR(-recon.gap)} of spending isn’t logged`
                      : `🔍 ${formatINR(recon.gap)} more than expected`
                    : '✅ Everything adds up'}
                </Text>
                <Text style={styles.meta}>
                  Since {new Date(recon.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: your money {recon.actualChange >= 0 ? 'went up' : 'went down'} {formatINR(Math.abs(recon.actualChange))}. You logged {formatINR(recon.loggedSpend)} spent
                  {recon.loggedIncome ? `, ${formatINR(recon.loggedIncome)} earned` : ''}
                  {recon.peopleFlow ? `, ${formatINR(Math.abs(recon.peopleFlow))} ${recon.peopleFlow < 0 ? 'lent/repaid out' : 'from people'}` : ''}.
                  {gapMatters(recon) && recon.gap > 0 ? ' Maybe income or a refund you didn’t add?' : ''}
                </Text>
                {gapMatters(recon) && recon.gap < 0 && (
                  <Button
                    size="sm"
                    icon="add"
                    label={`Log ${formatINR(-recon.gap)} now`}
                    onPress={() => router.push(`/add?amount=${-recon.gap}&note=${encodeURIComponent('Unlogged spending')}` as Href)}
                    style={{ alignSelf: 'flex-start' }}
                  />
                )}
              </View>
            )}

            <Text style={styles.note}>
              ℹ️ Open your bank and card apps about once a week and tap “Update balances”. It takes 30 seconds and keeps your net worth accurate.
            </Text>
          </>
        )}
      </ScrollView>

      {updating && <UpdateBalancesSheet list={list} onClose={() => setUpdating(false)} onSave={saveAll} />}
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

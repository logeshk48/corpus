import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssets } from '@/hooks/useAssets';
import { useBills } from '@/hooks/useBills';
import { useIous } from '@/hooks/useIous';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { addAsset, deleteAsset, saveMonthSnapshot, updateAsset } from '@/services/assets';
import type { ManualAsset, NewManualAsset } from '@/types/asset';
import { accountBalances } from '@/utils/accounts';
import { compactINR, formatINR, formatINRLong } from '@/utils/format';
import { jarsCheck, netWorthHistory, netWorthItems, netWorthTotals, type Confidence, type NwItem } from '@/utils/netWorth';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssetSheet from './AssetSheet';
import { styles } from './NetWorthScreen.styles';

type ViewKey = 'total' | 'withoutHome' | 'liquid';
const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'total', label: 'Net worth', hint: 'Everything you own − everything you owe' },
  { key: 'withoutHome', label: 'Without home', hint: 'Leaves out the home you live in and its loan' },
  { key: 'liquid', label: 'Liquid', hint: 'Cash and bank you could use now − all your debts' },
];
const PILL: Record<Confidence, { label: string; color: string }> = {
  verified: { label: 'VERIFIED', color: Corpus.income },
  manual: { label: 'YOUR VALUE', color: Corpus.textMuted },
  estimated: { label: 'ESTIMATE', color: Corpus.gold },
  stale: { label: 'OLD', color: Corpus.warning },
};

export default function NetWorthScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { accounts, loading: aLoading } = useAccounts();
  const { transactions } = useTransactions('last12Months');
  const { ious } = useIous();
  const { bills } = useBills();
  const { total: jarsTotal } = useVaults();
  const { assets, snapshots, loading: asLoading } = useAssets();
  const [view, setView] = useState<ViewKey>('total');
  const [sheet, setSheet] = useState<{ editing?: ManualAsset } | null>(null);

  const input = useMemo(
    () => ({ accounts: accountBalances(accounts, transactions), ious, bills, assets }),
    [accounts, transactions, ious, bills, assets]
  );
  const items = useMemo(() => netWorthItems(input), [input]);
  const totals = netWorthTotals(items);
  const history = useMemo(() => {
    // saved month snapshots win over recomputed past months
    return netWorthHistory(input, 12).map((h, i, arr) => (i < arr.length - 1 && snapshots[h.key] ? { ...h, totals: snapshots[h.key] } : h));
  }, [input, snapshots]);
  const jars = jarsCheck(items, jarsTotal);
  const loading = aLoading || asLoading;

  // keep this month's snapshot up to date (one write per change)
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  useEffect(() => {
    if (loading || items.length === 0) return;
    const t = setTimeout(() => saveMonthSnapshot(monthKey, totals).catch((e) => console.warn('Snapshot not saved', e)), 1500);
    return () => clearTimeout(t);
  }, [loading, totals.total, totals.withoutHome, totals.liquid]);

  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const change = prev ? totals[view] - prev.totals[view] : null;
  const max = Math.max(...history.map((h) => Math.abs(h.totals[view])), 1);

  const saveAsset = async (a: NewManualAsset) => {
    try {
      if (sheet?.editing) await updateAsset(sheet.editing.id, a);
      else await addAsset(a);
      showToast({ message: sheet?.editing ? 'Updated' : `${a.name} added` });
      setSheet(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };
  const removeAsset = (a: ManualAsset) => {
    const go = async () => {
      await deleteAsset(a.id);
      setSheet(null);
      showToast({ message: `${a.name} removed` });
    };
    if (Platform.OS === 'web') window.confirm(`Remove ${a.name}?`) && go();
    else Alert.alert(`Remove ${a.name}?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  const renderRow = (i: NwItem, k: number) => {
    const asset = assets.find((a) => `asset:${a.id}` === i.id);
    const pill = PILL[i.confidence];
    return (
      <Pressable
        key={i.id}
        style={[styles.row, k > 0 && styles.rowBorder]}
        onPress={() => (asset ? setSheet({ editing: asset }) : i.link && router.push(i.link as Href))}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.rowLabel}>{i.label}</Text>
            <View style={[styles.pill, { borderColor: pill.color }]}>
              <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
            </View>
          </View>
          {!!i.note && <Text style={[styles.rowNote, i.confidence === 'stale' && { color: Corpus.warning }]}>{i.note}</Text>}
        </View>
        <Text style={[styles.rowValue, { color: i.side === 'asset' ? Corpus.text : Corpus.warning }]}>
          {i.side === 'liability' ? '−' : ''}{formatINR(i.value)}
        </Text>
      </Pressable>
    );
  };

  const assetsList = items.filter((i) => i.side === 'asset').sort((a, b) => b.value - a.value);
  const debtsList = items.filter((i) => i.side === 'liability').sort((a, b) => b.value - a.value);
  const v = VIEWS.find((x) => x.key === view)!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Net worth"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          right={<Button size="sm" icon="add" label="Add asset" onPress={() => setSheet({})} />}
        />

        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{v.label.toUpperCase()}</Text>
              <Text style={[styles.heroValue, totals[view] < 0 && { color: Corpus.danger }]}>{formatINRLong(totals[view])}</Text>
              <Text style={styles.heroSub}>{v.hint}</Text>
              {change !== null && prev && (
                <Text style={[styles.heroSub, { color: change >= 0 ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                  {change >= 0 ? '▲' : '▼'} {formatINR(Math.abs(change))} since end of {prev.label}
                </Text>
              )}
            </View>

            <View style={styles.views}>
              {VIEWS.filter((x) => x.key !== 'withoutHome' || totals.hasHome).map((x) => (
                <Pressable key={x.key} style={[styles.view, view === x.key && styles.viewOn]} onPress={() => setView(x.key)}>
                  <Text style={styles.viewLabel}>{x.label}</Text>
                  <Text style={[styles.viewValue, totals[x.key] < 0 && { color: Corpus.danger }]}>{compactINR(totals[x.key])}</Text>
                </Pressable>
              ))}
            </View>

            {history.length >= 2 && (
              <View style={styles.chart}>
                <View style={styles.bars}>
                  {history.map((h, k) => {
                    const val = h.totals[view];
                    const last = k === history.length - 1;
                    return (
                      <View key={h.key} style={styles.col}>
                        <View style={[styles.bar, { height: Math.max(3, (Math.abs(val) / max) * 90), backgroundColor: val < 0 ? Corpus.danger : last ? Corpus.gold : Corpus.cardAlt }]} />
                        <Text style={styles.colLabel}>{h.label}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.chartNote}>
                  Month-end values{history.length < 12 ? ', built from your balance check-ins and loan schedules' : ''}. Red = you owed more than you had.
                </Text>
              </View>
            )}

            {!jars.ok && (
              <View style={styles.warn}>
                <Text style={styles.warnText}>
                  ⚠️ Your jars ({formatINR(jars.jarsTotal)}) add up to more than your cash and bank ({formatINR(jars.cash)}). Jar money lives inside your bank balance, so update your balances or take money out of a jar.
                </Text>
              </View>
            )}

            <SectionLabel right={formatINR(totals.assets)}>WHAT YOU OWN</SectionLabel>
            <View style={styles.card}>
              {assetsList.length ? assetsList.map(renderRow) : <Text style={styles.empty}>Nothing yet. Add your bank balance in Accounts.</Text>}
            </View>
            <Button variant="secondary" icon="add" label="Add home, vehicle, gold…" onPress={() => setSheet({})} />

            <SectionLabel right={totals.liabilities ? `−${formatINR(totals.liabilities)}` : undefined}>WHAT YOU OWE</SectionLabel>
            <View style={styles.card}>
              {debtsList.length ? debtsList.map(renderRow) : <Text style={styles.empty}>No debts. 🎉</Text>}
            </View>

            <Text style={styles.note}>
              ℹ️ Jars aren't added separately because they're inside your bank balance. Paying a card bill or lending money back and forth doesn't change your net worth. Money owed to you counts less the longer it's overdue. Loans count at the principal left, not total EMIs.
            </Text>
            {accounts.length === 0 && (
              <Button label="Add your bank & cash first" icon="wallet-outline" onPress={() => router.push('/accounts' as Href)} />
            )}
          </>
        )}
      </ScrollView>
      {sheet && <AssetSheet editing={sheet.editing} onClose={() => setSheet(null)} onSave={saveAsset} onDelete={sheet.editing ? () => removeAsset(sheet.editing!) : undefined} />}
    </SafeAreaView>
  );
}

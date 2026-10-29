import { Button, ScreenHeader, SectionLabel } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { ChartColors } from '@/constants/chartColors';
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
import { composition, explainChange, healthRatios, jarsCheck, monthlyPace, netWorthHistory, netWorthItems, netWorthTotals, nextMilestone, staleItems, type Confidence, type NwGroup, type NwItem } from '@/utils/netWorth';
import { monthlySpend } from '@/utils/moneyHealth';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssetSheet from './AssetSheet';
import { styles } from './NetWorthScreen.styles';

type ViewKey = 'total' | 'withoutHome' | 'liquid';
const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'total', label: 'Net worth', hint: 'Everything you own − everything you owe' },
  { key: 'withoutHome', label: 'Without home', hint: 'Leaves out the home you live in and its loan' },
  { key: 'liquid', label: 'Liquid', hint: 'Cash and bank you could use now − all your debts' },
];
const GROUP: Record<NwGroup, { label: string; color: string }> = {
  cash: { label: 'Cash & bank', color: Corpus.income },
  receivable: { label: 'Owed to you', color: ChartColors.netWorth.receivable },
  home: { label: 'Home', color: ChartColors.netWorth.home },
  property: { label: 'Property', color: ChartColors.netWorth.property },
  vehicle: { label: 'Vehicles', color: ChartColors.netWorth.vehicle },
  gold: { label: 'Gold', color: Corpus.gold },
  other: { label: 'Other', color: Corpus.textMuted },
  card: { label: 'Credit cards', color: Corpus.danger },
  loan: { label: 'Loans', color: Corpus.warning },
  homeLoan: { label: 'Home loan', color: ChartColors.netWorth.home },
  people: { label: 'Owed to people', color: ChartColors.netWorth.people },
};
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
  const [goldRate, setGoldRate] = useState<string | null>(null);

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
  const changes = useMemo(() => (prev ? explainChange(netWorthItems(input, prev.date, false), items) : null), [prev?.key, input, items]);
  const pace = monthlyPace(history.map((h) => h.totals.total));
  const milestone = nextMilestone(totals.total, pace);
  const spend = monthlySpend(transactions);
  const income = useMemo(() => {
    const from = Date.now() - 90 * 86_400_000;
    const inc = transactions.filter((t) => t.type === 'income' && new Date(t.date).getTime() > from).reduce((s2, t) => s2 + t.amount, 0);
    return inc / 3;
  }, [transactions]);
  const ratios = healthRatios(totals, items, spend, income);
  const old = staleItems(items);
  const golds = assets.filter((a) => a.kind === 'gold' && a.grams);
  const updateGold = async () => {
    const r = Number(goldRate);
    if (!r) return;
    const now = new Date().toISOString();
    await Promise.all(golds.map((g) => updateAsset(g.id, { rate24k: r, updatedAt: now })));
    setGoldRate(null);
    showToast({ message: `Gold updated at ${formatINR(r)}/g` });
  };
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

            {/* Next milestone */}
            <View style={styles.chart}>
              <Text style={styles.rowLabel}>
                {milestone.debtFree ? '🎯 Next: owe nothing (₹0)' : `🎯 Next: ${compactINR(milestone.target)}`}
              </Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.round(milestone.progress * 100)}%` }]} />
              </View>
              <Text style={styles.chartNote}>
                {formatINR(Math.max(0, milestone.target - totals.total))} to go
                {milestone.months ? ` · at your pace about ${milestone.months} month${milestone.months > 1 ? 's' : ''} (estimate)` : pace !== null && pace <= 0 ? ' · net worth went down recently, so no estimate yet' : ' · a pace estimate appears after 2 months of history'}
              </Text>
            </View>

            {/* What changed */}
            {changes && changes.lines.length > 0 && prev && (
              <View style={styles.chart}>
                <Text style={styles.rowLabel}>What changed since end of {prev.label}</Text>
                <View style={styles.views}>
                  {[
                    { l: 'Cash & owed to you', v: changes.saved },
                    { l: 'Debt', v: changes.debtPaid },
                    { l: 'Things you own', v: changes.valueChange },
                  ].map((c) => (
                    <View key={c.l} style={styles.view}>
                      <Text style={styles.viewLabel}>{c.l}</Text>
                      <Text style={[styles.viewValue, { color: c.v > 0 ? Corpus.income : c.v < 0 ? Corpus.danger : Corpus.textMuted }]}>
                        {c.v > 0 ? '+' : ''}{compactINR(c.v)}
                      </Text>
                    </View>
                  ))}
                </View>
                {changes.lines.slice(0, 5).map((l) => (
                  <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.chartNote}>
                      {l.label}
                      {l.kind === 'debt' && l.delta > 0 ? ' · paid down' : l.kind === 'debt' ? ' · grew' : l.kind === 'new' ? ' · added' : l.kind === 'value' ? ' · value changed' : ''}
                    </Text>
                    <Text style={[styles.chartNote, { color: l.delta > 0 ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                      {l.delta > 0 ? '+' : ''}{formatINR(l.delta)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

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

            {/* Health numbers */}
            <View style={styles.views}>
              <View style={styles.view}>
                <Text style={styles.viewLabel}>Debt vs assets</Text>
                <Text style={[styles.viewValue, { color: ratios.debtToAssets > 0.5 ? Corpus.danger : ratios.debtToAssets > 0.3 ? Corpus.warning : Corpus.income }]}>
                  {!Number.isFinite(ratios.debtToAssets) ? 'All debt' : ratios.debtToAssets > 1 ? `${ratios.debtToAssets.toFixed(1)}× assets` : `${Math.round(ratios.debtToAssets * 100)}%`}
                </Text>
              </View>
              <View style={styles.view}>
                <Text style={styles.viewLabel}>Cash covers</Text>
                <Text style={[styles.viewValue, { color: (ratios.monthsCovered ?? 0) < 1 ? Corpus.warning : Corpus.text }]}>
                  {ratios.monthsCovered === null ? '—' : `${ratios.monthsCovered.toFixed(1)} mo`}
                </Text>
              </View>
              <View style={styles.view}>
                <Text style={styles.viewLabel}>Worth in income</Text>
                <Text style={[styles.viewValue, { color: (ratios.monthsOfIncome ?? 0) < 0 ? Corpus.danger : Corpus.text }]}>
                  {ratios.monthsOfIncome === null ? '—' : `${ratios.monthsOfIncome < 0 ? '−' : ''}${Math.abs(ratios.monthsOfIncome).toFixed(1)} mo`}
                </Text>
              </View>
            </View>
            <Text style={styles.note}>
              Debt vs assets under 30% is comfortable. "Cash covers" = months your cash and bank pay your usual spending. "Worth in income" = your net worth in months of income.
            </Text>

            {/* Composition */}
            {(['asset', 'liability'] as const).map((side) => {
              const parts = composition(items, side);
              if (parts.length === 0) return null;
              return (
                <View key={side} style={styles.chart}>
                  <Text style={styles.rowLabel}>{side === 'asset' ? 'What you own is made of' : 'What you owe is made of'}</Text>
                  <View style={styles.stack}>
                    {parts.map((p) => (
                      <View key={p.group} style={{ flex: Math.max(p.share, 0.02), backgroundColor: GROUP[p.group].color }} />
                    ))}
                  </View>
                  <View style={styles.legend}>
                    {parts.map((p) => (
                      <Text key={p.group} style={styles.chartNote}>
                        <Text style={{ color: GROUP[p.group].color }}>● </Text>
                        {GROUP[p.group].label} {Math.round(p.share * 100)}%
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}

            {/* Old values + one gold rate for all gold */}
            {(old.length > 0 || golds.length > 0) && (
              <View style={[styles.chart, old.length > 0 && { borderColor: Corpus.warningLine, borderWidth: 1 }]}>
                {old.length > 0 && (
                  <>
                    <Text style={styles.rowLabel}>⏳ {old.length} value{old.length > 1 ? 's are' : ' is'} old</Text>
                    <Text style={styles.chartNote}>{old.map((o) => o.label).join(' · ')}. Tap each below to update, or update balances in Accounts.</Text>
                  </>
                )}
                {golds.length > 0 &&
                  (goldRate === null ? (
                    <Pressable onPress={() => setGoldRate(String(golds[0].rate24k ?? ''))}>
                      <Text style={[styles.chartNote, { color: Corpus.gold }]}>
                        💰 Gold at {formatINR(golds[0].rate24k ?? 0)}/g (24K). Tap to update today's rate for all your gold
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TextInput style={styles.rateInput} value={goldRate} onChangeText={(t) => setGoldRate(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="24K rate per gram" placeholderTextColor={Corpus.textFaint} autoFocus />
                      <Button size="sm" label="Update gold" onPress={updateGold} />
                    </View>
                  ))}
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

import Bullet from '@/components/charts/Bullet';
import Shine from '@/components/fx/Shine';
import TrendLine from '@/components/charts/TrendLine';
import Treemap from '@/components/charts/Treemap';
import { Button, Field, Group, IconChip, Screen, Segmented } from '@/components/ui';
import { useEntrance } from '@/hooks/useEntrance';
import { useTween } from '@/hooks/useTween';
import { Ionicons } from '@expo/vector-icons';
import { askWeb } from '@/services/confirm';
import { Chip, Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssets } from '@/hooks/useAssets';
import { useBills } from '@/hooks/useBills';
import { useIous } from '@/hooks/useIous';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { useGoldRate } from '@/hooks/useGoldRate';
import { useInvestments } from '@/hooks/useInvestments';
import { addAsset, deleteAsset, saveMonthSnapshot, updateAsset } from '@/services/assets';
import type { ManualAsset, NewManualAsset } from '@/types/asset';
import { accountBalances } from '@/utils/accounts';
import { compactINR, formatINR } from '@/utils/format';
import { composition, explainChange, healthRatios, jarsCheck, monthlyPace, netWorthHistory, netWorthItems, netWorthTotals, nextMilestone, staleItems, type Confidence, type NwGroup, type NwItem } from '@/utils/netWorth';
import { monthlySpend } from '@/utils/moneyHealth';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import AssetSheet from './AssetSheet';
import { styles } from './NetWorthScreen.styles';

type ViewKey = 'total' | 'withoutHome' | 'liquid';
const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'total', label: 'Net worth', hint: 'Everything you own minus everything you owe' },
  { key: 'withoutHome', label: 'Without your home', hint: 'Leaves out the home you live in and its loan' },
  { key: 'liquid', label: 'Ready cash', hint: 'Cash and bank you could use now, minus all your debts' },
];
// One identity colour + icon per kind of thing (same in the bars, the legend and the rows)
const GROUP: Record<NwGroup, { label: string; color: string; icon: string }> = {
  cash: { label: 'Cash and bank', color: Chip.green, icon: 'mci:bank' },
  investment: { label: 'Investments', color: Chip.indigo, icon: 'trending-up' },
  retirement: { label: 'EPF, PPF, NPS', color: Chip.blue, icon: 'shield-checkmark' },
  receivable: { label: 'Owed to you', color: Chip.teal, icon: 'people' },
  home: { label: 'Home', color: Chip.purple, icon: 'home' },
  property: { label: 'Property', color: Chip.pink, icon: 'business' },
  vehicle: { label: 'Vehicles', color: Chip.orange, icon: 'car' },
  gold: { label: 'Gold', color: Chip.yellow, icon: 'diamond' },
  other: { label: 'Other', color: Chip.gray, icon: 'cube' },
  card: { label: 'Credit cards', color: Chip.red, icon: 'card' },
  loan: { label: 'Loans', color: Chip.orange, icon: 'document-text' },
  homeLoan: { label: 'Home loan', color: Chip.purple, icon: 'home' },
  people: { label: 'Owed to people', color: Chip.pink, icon: 'people' },
};
// How sure the number is, in words
const SURE: Record<Confidence, string | null> = { verified: null, manual: 'Your value', estimated: 'Estimate', stale: 'Old value' };
const VIEW_OPTIONS = [{ value: 'total', label: 'Everything' }, { value: 'withoutHome', label: 'Without home' }, { value: 'liquid', label: 'Ready cash' }] as const;

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
  const gold = useGoldRate();
  const { investments } = useInvestments();
  const [sheet, setSheet] = useState<{ editing?: ManualAsset } | null>(null);
  const [goldRate, setGoldRate] = useState<string | null>(null);

  const input = useMemo(
    () => ({ accounts: accountBalances(accounts, transactions), ious, bills, assets, investments, goldRate: gold.rate ? { rate: gold.rate, mode: gold.mode } : null }),
    [accounts, transactions, ious, bills, assets, investments, gold.rate, gold.mode]
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
    await gold.setCustom(r);
    setGoldRate(null);
    showToast({ message: `Using your price of ${formatINR(r)} a gram for all gold` });
  };

  const change = prev ? totals[view] - prev.totals[view] : null;
  const max = Math.max(...history.map((h) => Math.abs(h.totals[view])), 1);

  const saveAsset = async (a: NewManualAsset) => {
    try {
      if (sheet?.editing) await updateAsset(sheet.editing.id, a);
      else await addAsset(a);
      showToast({ message: sheet?.editing ? `${a.name} saved` : `${a.name} added` });
      setSheet(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };
  const removeAsset = (a: ManualAsset) => {
    const go = async () => {
      await deleteAsset(a.id);
      setSheet(null);
      showToast({ message: `${a.name} removed` });
    };
    if (Platform.OS === 'web') askWeb(`Remove ${a.name}?`, 'Remove').then((y) => { if (y) go(); });
    else Alert.alert(`Remove ${a.name}?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  const t = useEntrance(900, loading);
  const totalV = useTween(loading ? 0 : totals[view]);
  const assetsList = items.filter((i) => i.side === 'asset').sort((a, b) => b.value - a.value);
  const debtsList = items.filter((i) => i.side === 'liability').sort((a, b) => b.value - a.value);
  const v = VIEWS.find((x) => x.key === view)!;
  const own = composition(items, 'asset');
  const owe = composition(items, 'liability');
  const scale = Math.max(totals.assets, totals.liabilities, 1);
  const bars = history.map((h) => ({ key: h.key, label: h.label.slice(0, history.length > 6 ? 1 : 3), full: h.label, value: Math.round(h.totals[view]) }));

  const row = (i: NwItem) => {
    const asset = assets.find((a) => `asset:${a.id}` === i.id);
    const g = GROUP[i.group];
    const sure = SURE[i.confidence];
    const tappable = !!asset || !!i.link;
    return (
      <Pressable key={i.id} disabled={!tappable} onPress={() => (asset ? setSheet({ editing: asset }) : i.link && router.push(i.link as Href))}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: Corpus.cardAlt }]} accessibilityRole={tappable ? 'button' : undefined}
        accessibilityLabel={`${i.label}, ${i.side === 'liability' ? 'you owe ' : ''}${formatINR(i.value)}${sure ? `, ${sure}` : ''}`}>
        <IconChip icon={g.icon} color={g.color} />
        <View style={styles.rowBody}>
          <Text style={styles.rowLabel} numberOfLines={1}>{i.label}</Text>
          <View style={styles.rowSub}>
            {i.confidence === 'stale' && <Ionicons name="time" size={12} color={Corpus.warning} style={{ marginTop: 2 }} />}
            <Text style={[styles.rowNote, i.confidence === 'stale' && { color: Corpus.warning }]} numberOfLines={2}>
              {[sure, i.note?.replace(/ · /g, ', ').replace(/\/g\b/, ' a gram')].filter(Boolean).join('. ') || g.label}
            </Text>
          </View>
        </View>
        <Text style={styles.rowValue}>{i.side === 'liability' ? '−' : ''}{formatINR(i.value)}</Text>
        {tappable && <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />}
      </Pressable>
    );
  };

  // One side of the balance: a bar on the shared scale, split by kind, with every part named
  const side = (title: string, total: number, parts: typeof own, minus?: boolean) => (
    <View style={{ gap: 6 }}>
      <View style={styles.sideHead}>
        <Text style={styles.sideTitle}>{title}</Text>
        <Text style={styles.sideTotal}>{minus && total > 0 ? '−' : ''}{formatINR(total)}</Text>
      </View>
      <View style={styles.scale} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.stack, { width: `${Math.max(total > 0 ? 2 : 0, (total / scale) * 100 * t)}%` }]}>
          {parts.map((p) => <View key={p.group} style={{ flex: Math.max(p.share, 0.02), backgroundColor: GROUP[p.group].color }} />)}
        </View>
      </View>
      {parts.length === 0 ? (
        <Text style={styles.rowNote}>{minus ? 'Nothing. You owe no one.' : 'Nothing added yet'}</Text>
      ) : (
        <View style={styles.legend}>
          {parts.slice(0, 5).map((p) => (
            <View key={p.group} style={styles.legendItem} accessible accessibilityLabel={`${GROUP[p.group].label}: ${formatINR(p.value)}, ${Math.round(p.share * 100)} percent`}>
              <View style={[styles.dot, { backgroundColor: GROUP[p.group].color }]} />
              <Text style={styles.legendText}>{GROUP[p.group].label} {compactINR(p.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const up = (change ?? 0) >= 0;
  // Where the wealth sits + is too much of it in one place?
  const tree = own.map((p) => ({ key: p.group, label: GROUP[p.group].label, value: p.value, color: GROUP[p.group].color }));
  const top = own[0];
  const concentrated = top && top.share >= 0.6 && own.length >= 1 && totals.assets > 0;
  // How long it lasts: months of your usual spending covered
  const readyCash = items.filter((i) => i.side === 'asset' && i.liquid).reduce((a, i) => a + i.value, 0);
  const lasts = (amount: number) => (spend > 0 ? Math.max(0, amount) / spend : null);
  const span = (m: number | null) => (m === null ? '–' : m >= 24 ? `${(m / 12).toFixed(1)} years` : m >= 1 ? `${m.toFixed(1)} months` : `${Math.round(m * 30)} days`);
  const cells = (m: number | null, color: string) => (
    <View style={styles.cells} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 12 }, (_, k) => {
        const fill = m === null ? 0 : Math.max(0, Math.min(1, m - k)) * t;
        return (
          <View key={k} style={styles.cell}>
            <View style={{ width: `${fill * 100}%`, height: '100%', backgroundColor: color }} />
          </View>
        );
      })}
    </View>
  );

  return (
    <>
      <Screen title="Net worth" subtitle="What you own minus what you owe" right={<Button size="sm" icon="add" label="Add" onPress={() => setSheet({})} />}>
        {loading ? (
          <View style={{ gap: 14 }} accessibilityLabel="Loading net worth" accessibilityState={{ busy: true }}>
            <View style={[styles.skel, { height: 330 }]} />
            <View style={[styles.skel, { height: 200 }]} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Shine />
              {totals.hasHome || totals.liquid !== totals.total ? (
                <Segmented options={VIEW_OPTIONS.filter((o) => o.value !== 'withoutHome' || totals.hasHome)} value={view} onChange={(k) => setView(k as ViewKey)} />
              ) : null}
              <View style={{ gap: 2, marginTop: 6 }}>
                <Text style={styles.heroLabel}>{v.label}</Text>
                <Text style={[styles.heroValue, totals[view] < 0 && { color: Corpus.danger }]} numberOfLines={1} adjustsFontSizeToFit
                  accessibilityLabel={`${v.label}: ${formatINR(totals[view])}`}>
                  {formatINR(Math.round(totalV))}
                </Text>
                {change !== null && prev ? (
                  <View style={[styles.change, { backgroundColor: change === 0 ? Corpus.cardAlt : up ? Corpus.incomeTint : Corpus.dangerTint }]}>
                    <Ionicons name={change === 0 ? 'remove' : up ? 'trending-up' : 'trending-down'} size={15} color={change === 0 ? Corpus.textMuted : up ? Corpus.income : Corpus.danger} />
                    <Text style={[styles.changeText, { color: change === 0 ? Corpus.textMuted : up ? Corpus.income : Corpus.danger }]}>
                      {change === 0 ? `Same as end of ${prev.label}` : `${up ? 'Up' : 'Down'} ${formatINR(Math.abs(change))} since end of ${prev.label}`}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.heroSub}>{v.hint}</Text>
                )}
              </View>

              {bars.length >= 2 && (
                <View style={styles.trend}>
                  <TrendLine points={bars} color={totals[view] < 0 ? Corpus.danger : Corpus.income} appear={t} />
                </View>
              )}
            </View>

            {(old.length > 0 || !jars.ok) && (
              <View style={styles.card}>
                {old.length > 0 && (
                  <Pressable style={styles.notice} onPress={() => router.push('/accounts' as Href)} accessibilityRole="button">
                    <Ionicons name="time" size={18} color={Corpus.warning} />
                    <Text style={styles.noticeText}>
                      {old.length} value{old.length > 1 ? 's are' : ' is'} old: {old.slice(0, 3).map((o) => o.label).join(', ')}{old.length > 3 ? ` and ${old.length - 3} more` : ''}. Update them so this number is right.
                    </Text>
                  </Pressable>
                )}
                {!jars.ok && (
                  <View style={styles.notice}>
                    <Ionicons name="alert-circle" size={18} color={Corpus.warning} />
                    <Text style={styles.noticeText}>
                      Your jars hold {formatINR(jars.jarsTotal)} in cash, more than your cash and bank ({formatINR(jars.cash)}). Jar money lives inside your bank balance, so update your balances or take money out of a jar.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">The balance</Text>
              {side('You own', totals.assets, own)}
              {side('You owe', totals.liabilities, owe, true)}
              {totals.assets > 0 && totals.liabilities > 0 && (
                <Text style={styles.rowNote}>
                  Debt is {ratios.debtToAssets > 1 ? `${ratios.debtToAssets.toFixed(1)} times` : `${Math.round(ratios.debtToAssets * 100)}% of`} what you own. {ratios.debtToAssets > 0.5 ? 'That’s high.' : ratios.debtToAssets > 0.3 ? 'Keep an eye on it.' : 'That’s healthy.'} Under 30% is good.
                </Text>
              )}
            </View>

            {tree.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle} accessibilityRole="header">Where your wealth sits</Text>
                <Treemap items={tree} appear={t} />
                {concentrated && (
                  <View style={styles.notice}>
                    <Ionicons name="alert-circle" size={18} color={Corpus.warning} />
                    <Text style={styles.noticeText}>
                      {Math.round(top.share * 100)}% of what you own is {GROUP[top.group].label.toLowerCase()}. If its value falls 10%, your net worth drops about {formatINR(Math.round(top.value * 0.1))}. Building up {top.group === 'cash' ? 'investments' : 'cash and investments'} alongside makes you steadier.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {spend > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} accessibilityRole="header">How long it lasts</Text>
                  <Text style={styles.cardSide}>at {compactINR(spend)} a month</Text>
                </View>
                <View style={{ gap: 4 }} accessible accessibilityLabel={`Ready cash covers ${span(lasts(readyCash))} of your spending`}>
                  <View style={styles.line}>
                    <Text style={styles.lastName}>Ready cash</Text>
                    <Text style={[styles.lastValue, (lasts(readyCash) ?? 9) < 1 && { color: Corpus.warning }]}>{span(lasts(readyCash))}</Text>
                  </View>
                  {cells(lasts(readyCash), (lasts(readyCash) ?? 9) < 3 ? Corpus.warning : Corpus.income)}
                </View>
                <View style={{ gap: 4 }} accessible accessibilityLabel={`Everything you own minus debts covers ${span(lasts(totals.total))}`}>
                  <View style={styles.line}>
                    <Text style={styles.lastName}>Everything, after debts</Text>
                    <Text style={styles.lastValue}>{span(lasts(totals.total))}</Text>
                  </View>
                  {cells(lasts(totals.total), Chip.indigo)}
                </View>
                <Text style={styles.rowNote}>Each block is one month of your usual spending. Aim for 3 to 6 months in ready cash.</Text>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} accessibilityRole="header">{milestone.debtFree ? 'Next stop: owe nothing' : `Next stop: ${compactINR(milestone.target)}`}</Text>
                <Text style={styles.cardSide}>{formatINR(Math.max(0, milestone.target - totals.total))} to go</Text>
              </View>
              <View style={styles.ladder} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={styles.ladderTrack} />
                <View style={[styles.ladderFill, { width: `${milestone.progress * 100 * t}%` }]} />
                <View style={[styles.stop, { left: 0 }]} />
                <View style={[styles.stop, styles.stopEnd]} />
                <View style={[styles.you, { left: `${milestone.progress * 100 * t}%` }]}><View style={styles.youDot} /></View>
              </View>
              <View style={styles.line}>
                <Text style={styles.rowNote}>{compactINR(milestone.from)}</Text>
                <Text style={styles.rowNote}>{compactINR(milestone.target)}</Text>
              </View>
              <Text style={styles.rowNote}>
                {milestone.months ? `At your pace, about ${milestone.months} month${milestone.months > 1 ? 's' : ''} away (estimate)` : pace !== null && pace <= 0 ? 'Net worth went down lately, so there’s no estimate yet' : 'An estimate appears after 2 months of history'}
              </Text>
            </View>

            {changes && changes.lines.length > 0 && prev && (
              <View style={styles.card}>
                <Text style={styles.cardTitle} accessibilityRole="header">What changed since {prev.label}</Text>
                <View style={styles.strip}>
                  {[{ l: 'Cash', v: changes.saved }, { l: 'Debt', v: changes.debtPaid }, { l: 'Things you own', v: changes.valueChange }].map((c, k) => (
                    <View key={c.l} style={[styles.stat, k > 0 && styles.statRule]}>
                      <Text style={styles.statLabel}>{c.l}</Text>
                      <Text style={[styles.statValue, { color: c.v > 0 ? Corpus.income : c.v < 0 ? Corpus.danger : Corpus.textMuted }]} numberOfLines={1} adjustsFontSizeToFit>
                        {c.v > 0 ? '+' : ''}{compactINR(c.v)}
                      </Text>
                    </View>
                  ))}
                </View>
                {changes.lines.slice(0, 5).map((l) => (
                  <View key={l.id} style={styles.line}>
                    <Text style={styles.lineName} numberOfLines={1}>
                      {l.label}{l.kind === 'debt' && l.delta > 0 ? ', paid down' : l.kind === 'debt' ? ', grew' : l.kind === 'new' ? ', added' : l.kind === 'value' ? ', value changed' : ''}
                    </Text>
                    <Text style={[styles.lineAmt, { color: l.delta > 0 ? Corpus.income : Corpus.danger }]}>{l.delta > 0 ? '+' : ''}{formatINR(l.delta)}</Text>
                  </View>
                ))}
              </View>
            )}

            {golds.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} accessibilityRole="header">Gold price</Text>
                  <Text style={styles.cardSide}>{gold.rate ? `${formatINR(gold.rate)} a gram` : gold.fetching ? 'Getting it…' : 'Not available offline'}</Text>
                </View>
                <Text style={styles.rowNote}>
                  {gold.mode === 'live'
                    ? `24K market price${gold.liveAt ? `, ${new Date(gold.liveAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : ''}. International price plus 15% import duty, before GST and making charges.`
                    : 'Your own 24K price, used for all your gold.'}
                </Text>
                {goldRate === null ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button size="sm" variant="secondary" label={gold.mode === 'custom' ? 'Change my price' : 'Use my own price'} onPress={() => setGoldRate(String(gold.rate ?? ''))} />
                    {gold.mode === 'custom' && <Button size="sm" variant="secondary" label="Use market price" onPress={() => gold.useLive()} />}
                  </View>
                ) : (
                  <>
                    <Field money label="Your jeweller’s 24K rate per gram" value={goldRate} onChangeText={(x) => setGoldRate(x.replace(/[^0-9.]/g, ''))} autoFocus />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button size="sm" label="Save" onPress={updateGold} />
                      <Button size="sm" variant="secondary" label="Cancel" onPress={() => setGoldRate(null)} />
                    </View>
                  </>
                )}
              </View>
            )}

            <Group title="What you own">
              {assetsList.length
                ? assetsList.map(row)
                : [<Pressable key="none" style={styles.row} onPress={() => router.push('/accounts' as Href)} accessibilityRole="button">
                    <IconChip icon="mci:bank" color={Chip.green} />
                    <View style={styles.rowBody}><Text style={styles.rowLabel}>Add your bank and cash</Text><Text style={styles.rowNote}>Start in Accounts</Text></View>
                    <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
                  </Pressable>]}
            </Group>
            <Button variant="secondary" icon="add" label="Add a home, vehicle or gold" onPress={() => setSheet({})} />

            <Group title="What you owe">
              {debtsList.length
                ? debtsList.map(row)
                : [<View key="none" style={styles.row}><IconChip icon="checkmark" color={Chip.green} /><View style={styles.rowBody}><Text style={styles.rowLabel}>No debts</Text><Text style={styles.rowNote}>You owe no one</Text></View></View>]}
            </Group>

            <Text style={styles.note}>
              Jars and investments in jars are counted once, inside your bank and Invest. Paying a card bill doesn’t change net worth. Money owed to you counts for less the longer it’s overdue. Loans count at the principal left.
            </Text>
          </>
        )}
      </Screen>
      {sheet && <AssetSheet editing={sheet.editing} onClose={() => setSheet(null)} onSave={saveAsset} onDelete={sheet.editing ? () => removeAsset(sheet.editing!) : undefined} />}
    </>
  );
}

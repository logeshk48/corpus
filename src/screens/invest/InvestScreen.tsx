import Aura from '@/components/fx/Aura';
import Shine from '@/components/fx/Shine';
import { TAB_BAR_SPACE } from '@/components/GlassTabBar';
import { Button, IconChip, Tap } from '@/components/ui';
import { useSparks } from '@/hooks/useSparks';
import { useTween } from '@/hooks/useTween';
import Animated, { FadeIn } from 'react-native-reanimated';
import HoldingRow, { HIDDEN, type RowData } from './HoldingRow';
import IndexStrip from './IndexStrip';
import UnderlineTabs from './UnderlineTabs';
import { askWeb } from '@/services/confirm';
import { ChartColors } from '@/constants/chartColors';
import { Chip, Corpus } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { isLinked, liveRefOf, useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { saveSettings } from '@/services/settings';
import { addInvestment, addMoney, buyUnits, deleteInvestment, sellUnits, updateInvestment, updateValue } from '@/services/investments';
import { investMeta, type Investment, type NewInvestment } from '@/types/investment';
import { compactINR, formatINR, formatINRLong, ordinal as dayLabel } from '@/utils/format';
import { currentValue, daysOld, gain, isStale, needsCheckup, portfolio, yearlyReturn } from '@/utils/investments';
import { Ionicons } from '@expo/vector-icons';
import { bookedThisYear, portfolioTax } from '@/utils/capitalGains';
import { dividendTotal, fyOf, fyStart } from '@/utils/corporateActions';
import { useRealized } from '@/hooks/useRealized';
import { deleteRealized } from '@/services/realized';
import { formatPct, formatPrice, fundClassOf, getLive, parseWatch, priceTime, refKey, shortSymbol, watchId, type LiveKind, type LivePrice } from '@/utils/market';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InvestmentSheet, { type InvSheetMode } from './InvestmentSheet';
import { m } from './Market.styles';
import MarketSearchSheet, { type Target } from './MarketSearchSheet';
import ImportSheet from './ImportSheet';
import GoalsCard from './GoalsCard';
import { useRouter } from 'expo-router';
import { useVaults } from '@/hooks/useVaults';
import { useGoalsToJars } from '@/hooks/useGoalsToJars';
import { jarsWithInvestments, suggestJar } from '@/utils/jarFunds';
import JarPickerSheet from '@/screens/vaults/components/JarPickerSheet';
import { updateInvestment as linkInvestment } from '@/services/investments';
import MixCard from './MixCard';
import SipCards from './SipCards';
import SipSheet from './SipSheet';
import { confirmSip, saveSip, saveSipWithHistory, skipSip } from '@/services/investments';
import { saveMix, subscribeMix, type MixSnap } from '@/services/investMix';
import { holdingXirr, portfolioXirr } from '@/utils/returns';
import { monthKey, nextSip, pendingSips, sipAmount, sipStreak } from '@/utils/sip';
import QuoteSheet from './QuoteSheet';
import { styles } from './InvestScreen.styles';

const CLASS: Record<string, { label: string; color: string }> = {
  equity: { label: 'Equity (MF, stocks)', color: ChartColors.netWorth.investment },
  debt: { label: 'Fixed income (FD)', color: ChartColors.income },
  retirement: { label: 'Retirement (EPF, PPF, NPS)', color: ChartColors.netWorth.retirement },
  gold: { label: 'Gold', color: Corpus.gold },
  crypto: { label: 'Crypto', color: ChartColors.netWorth.vehicle },
  other: { label: 'Other', color: Corpus.textMuted },
};

export default function InvestScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { investments, live, liveError, updatedAt, loading, refresh } = useInvestments();
  const { settings } = useSettings();
  const [mode, setMode] = useState<InvSheetMode | null>(null);
  const [search, setSearch] = useState<LiveKind | null>(null);
  const [importing, setImporting] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [linkFor, setLinkFor] = useState<Investment | null>(null); // attach a live price to an existing manual holding
  const watchlist = settings.watchlist ?? [];
  const [tab, setTab] = useState<'holdings' | 'watchlist' | 'sips' | 'analysis'>('holdings');
  const [sort, setSort] = useState<'value' | 'returns' | 'today' | 'name'>('value');
  const [asc, setAsc] = useState(false); // tap the chosen sort again to flip it
  // privacy mode: hide rupee amounts, keep percentages (Angel One and Kite do the same)
  const [hide, setHide] = useState(false);
  useEffect(() => setHide(!!settings.hideAmounts), [settings.hideAmounts]);
  const toggleHide = () => { setHide(!hide); saveSettings({ hideAmounts: !hide }).catch(() => {}); };
  const money = (n: number) => (hide ? HIDDEN : formatINR(Math.round(n)));
  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    setPulling(true);
    await Promise.all([refresh(), watchlist.length ? getLive(watchlist.map(parseWatch)).then(setWp).catch(() => {}) : null]);
    setPulling(false);
  };
  const [wp, setWp] = useState<Record<string, LivePrice>>({});
  const wKey = watchlist.join(',');
  useEffect(() => {
    if (!watchlist.length) return;
    let alive = true;
    const load = () => getLive(watchlist.map(parseWatch)).then((r) => alive && setWp(r)).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wKey]);
  const toggleWatch = (t: Target) => {
    const id = watchId(t);
    const next = watchlist.includes(id) ? watchlist.filter((w) => w !== id) : [...watchlist, id];
    saveSettings({ watchlist: next }).catch(() => showToast({ message: 'Could not save. Try again.' }));
    showToast({ message: watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist' });
  };
  const holdingOf = (t: Target) => investments.find((h) => isLinked(h) && refKey(liveRefOf(h)!) === refKey(t));
  const targetOf = (h: Investment): Target | null => {
    const r = liveRefOf(h);
    return r ? { ...r, name: h.name } : null;
  };
  const searchFor = (h: Investment): LiveKind => (h.type === 'mf' ? 'fund' : h.type === 'nps' ? 'nps' : h.type === 'crypto' ? 'crypto' : 'stock');
  const realized = useRealized();
  const booked = useMemo(() => bookedThisYear(realized, fyStart()), [realized]);
  const fySales = realized.filter((r) => new Date(r.date) >= fyStart());
  const tax = useMemo(() => portfolioTax(investments, new Date(), booked.exemptionUsed), [investments, booked.exemptionUsed]);
  const divs = investments.reduce((a, h) => a + dividendTotal(h), 0);
  const dayGain = Object.values(live).reduce((a, l) => (l.kind === 'stock' && l.dayGain != null ? a + l.dayGain : a), 0);
  const hasStockLive = Object.values(live).some((l) => l.kind === 'stock');
  const pf = useMemo(() => portfolio(investments), [investments]);
  const xirrAll = useMemo(() => portfolioXirr(investments.map((h) => ({ h, value: currentValue(h).value }))), [investments]);

  // SIPs
  const [sipFor, setSipFor] = useState<Investment | null>(null);
  const [sipPick, setSipPick] = useState(false); // search opened to start a new SIP
  const [sipForId, setSipForId] = useState<string | null>(null); // a fund just added for a SIP → open its SIP sheet once it appears
  useEffect(() => {
    const h = sipForId && investments.find((x) => x.id === sipForId);
    if (h) (setSipFor(h), setSipForId(null));
  }, [sipForId, investments]);
  const pending = useMemo(() => pendingSips(investments), [investments]);
  const sipYes = async (p: (typeof pending)[number]) => {
    try {
      const e = await confirmSip(p.h, p);
      showToast({ message: e.units ? `${p.h.name}: +${e.units} units at ${formatPrice(e.price)}` : `${formatINR(p.amount)} added to ${p.h.name}` });
    } catch {
      showToast({ message: 'NAV for that day isn’t out yet. Try again tomorrow.' });
    }
  };
  const sipSkip = (p: (typeof pending)[number]) => skipSip(p.h, p).then(() => showToast({ message: 'Marked as skipped' }));

  // Goals live in Jars now: one goal = one jar (cash + linked investments)
  const { vaults: cashJars, loading: jarsLoading } = useVaults();
  const jars = jarsWithInvestments(cashJars, investments);
  useGoalsToJars(settings.investGoals, investments, !loading && !jarsLoading);
  const [pickFor, setPickFor] = useState<Investment | null>(null);

  // Mix history: one snapshot per month (latest value wins)
  const [mixHistory, setMixHistory] = useState<MixSnap[]>([]);
  useEffect(() => subscribeMix(setMixHistory), []);
  const mixKey = `${monthKey(new Date())}:${Math.round(pf.value / 1000)}`;
  useEffect(() => {
    if (!investments.length || loading) return;
    const byCls: Record<string, number> = {};
    for (const a of pf.allocation) byCls[a.cls] = Math.round(a.value);
    saveMix({ month: monthKey(new Date()), total: Math.round(pf.value), invested: Math.round(pf.invested), byCls, at: new Date().toISOString() }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixKey, loading]);
  const checkup = investments.filter((h) => needsCheckup(h));
  // sparklines: a month of prices for every live holding and watchlist item
  const sparkRefs = useMemo(() => [...investments.map(liveRefOf).filter((r): r is NonNullable<typeof r> => !!r), ...watchlist.map(parseWatch)], [investments, watchlist]);
  const sparks = useSparks(sparkRefs, '1mo');

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      showToast({ message: msg });
      setMode(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Could not save. Try again.' });
    }
  };
  const save = (h: NewInvestment) =>
    run(() => (mode?.kind === 'edit' ? updateInvestment(mode.h.id, h) : addInvestment(h)), mode?.kind === 'edit' ? 'Updated' : `${h.name} added`);
  const remove = (h: Investment) => {
    const go = () => run(() => deleteInvestment(h.id), `${h.name} removed`);
    if (Platform.OS === 'web') askWeb(`Remove ${h.name}?`, 'Remove').then((y) => { if (y) go(); });
    else Alert.alert(`Remove ${h.name}?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  // ── Rows for the tables ──
  const rowsOf = () => {
    const list = investments.map((h) => {
      const g = gain(h);
      const l = live[h.id];
      const linked = isLinked(h);
      const ref = liveRefOf(h);
      const meta = investMeta(h.type);
      const unitWord = h.type === 'stock' || h.type === 'goldbond' ? 'shares' : h.type === 'crypto' ? 'coins' : 'units';
      const qty = h.units ? Math.round(h.units * 1000) / 1000 : 0;
      const avg = h.units ? h.invested / h.units : null;
      const ns = nextSip(h);
      const jar = jars.find((j) => j.id === h.goalId);
      const auto = currentValue(h).auto;
      const old = isStale(h) && !linked;
      return {
        h, linked, ref, l, g,
        d: {
          key: h.id,
          title: h.type === 'stock' && h.symbol ? shortSymbol(h.symbol) : h.name,
          sub: linked && qty ? `${qty} ${unitWord}${avg ? `, avg ${formatPrice(avg)}` : ''}` : `${meta.label}, ${auto ? `grows at ${h.rate}% a year` : daysOld(h) <= 0 ? 'updated today' : `updated ${daysOld(h)} days ago`}`,
          value: g.value, pnl: g.gain, pnlPct: g.pct,
          ltp: l?.price ?? null, dayPct: l?.changePct ?? null, dayLabel: l?.kind === 'crypto' ? '24h' : l?.kind === 'stock' ? 'today' : 'last NAV',
          spark: ref ? sparks[refKey(ref)] : undefined,
          note: [h.sip?.active ? `SIP ${formatINR(sipAmount(h.sip, new Date()))}${ns ? `, next ${ns.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}` : null, jar ? `For ${jar.name}` : null].filter(Boolean).join('. '),
          warn: old,
        } as RowData,
      };
    });
    const by = {
      value: (a: (typeof list)[number], b: (typeof list)[number]) => b.g.value - a.g.value,
      returns: (a: (typeof list)[number], b: (typeof list)[number]) => b.g.pct - a.g.pct,
      today: (a: (typeof list)[number], b: (typeof list)[number]) => (b.l?.changePct ?? -999) - (a.l?.changePct ?? -999),
      name: (a: (typeof list)[number], b: (typeof list)[number]) => a.d.title.localeCompare(b.d.title),
    }[sort];
    const sorted = list.sort(by);
    return asc ? sorted.reverse() : sorted;
  };
  const rows = rowsOf();
  const sipList = investments.filter((h) => h.sip);
  const sipMonthly = sipList.filter((h) => h.sip?.active).reduce((a, h) => a + sipAmount(h.sip!, new Date()), 0);
  const invested = pf.invested;
  const totalUp = pf.gain >= 0;
  const valueV = useTween(loading ? 0 : pf.value);

  return (
    <View style={styles.safe}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} pointerEvents="none"><Aura color={totalUp ? Chip.green : Chip.red} second={Chip.teal} /></View>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + 40 }]} showsVerticalScrollIndicator={false} stickyHeaderIndices={investments.length ? [3] : undefined}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} tintColor={Corpus.gold} colors={[Corpus.gold]} />}>
        <View style={styles.headRow}>
          <Text style={styles.heading} accessibilityRole="header">Invest</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Tap onPress={() => setSearch('stock')} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Search stocks, funds, NPS, crypto"><Ionicons name="search" size={19} color={Corpus.text} /></Tap>
            <Tap onPress={() => setImporting(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Import from Zerodha, Groww or any app"><Ionicons name="download-outline" size={19} color={Corpus.text} /></Tap>
            <Tap onPress={() => setMode({ kind: 'new' })} style={[styles.iconBtn, { backgroundColor: Corpus.gold }]} accessibilityRole="button" accessibilityLabel="Add an investment"><Ionicons name="add" size={22} color={Corpus.onGold} /></Tap>
          </View>
        </View>

        <IndexStrip onOpen={(symbol, name) => setTarget({ kind: 'stock', id: symbol, name })} />

        {loading ? (
          <View style={[styles.card, { height: 180 }]} accessibilityLabel="Loading" accessibilityState={{ busy: true }} />
        ) : investments.length === 0 ? (
          <View style={[styles.card, { alignItems: 'center', gap: 10, paddingVertical: 26 }]}>
            <IconChip icon="trending-up" color={Chip.green} size={52} />
            <Text style={styles.emptyTitle}>No investments yet</Text>
            <Text style={[styles.meta, { textAlign: 'center' }]}>Add stocks, mutual funds, FDs, EPF, PPF, NPS or gold to track their value and returns. Corpus does not connect to your bank or demat account.</Text>
            <Button label="Search stocks and funds" icon="search" onPress={() => setSearch('stock')} style={{ alignSelf: 'stretch', marginTop: 6 }} />
            <Button variant="secondary" label="Paste holdings from your broker" icon="clipboard-outline" onPress={() => setImporting(true)} style={{ alignSelf: 'stretch' }} />
            <Button variant="quiet" label="Add FD, EPF, PPF or other" icon="add" onPress={() => setMode({ kind: 'new' })} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <View style={[styles.card, styles.portfolio]}>
            <Shine />
            <View style={styles.row}>
              <Tap onPress={toggleHide} style={[styles.row, { gap: 6, flex: 1 }]} accessibilityRole="button" accessibilityLabel={hide ? 'Show amounts' : 'Hide amounts'} hitSlop={8}>
                <Text style={styles.meta}>Current value</Text>
                <Ionicons name={hide ? 'eye-off-outline' : 'eye-outline'} size={15} color={Corpus.textMuted} />
              </Tap>
              {Object.keys(live).length > 0 && (
                <View style={styles.livePill}>
                  <View style={[styles.liveDot, { backgroundColor: liveError ? Corpus.warning : Corpus.income }]} />
                  <Text style={styles.liveText}>{liveError ? 'Last known prices' : `Live, ${priceTime(updatedAt)}`}</Text>
                </View>
              )}
            </View>
            <Text style={styles.bigValue} adjustsFontSizeToFit numberOfLines={1}>{hide ? HIDDEN : formatINR(Math.round(valueV))}</Text>
            <View style={styles.pfRows}>
              <View style={styles.pfRow}>
                <Text style={styles.pfLabel}>Invested</Text>
                <Text style={styles.pfNum}>{money(invested)}</Text>
              </View>
              {hasStockLive && (
                <View style={styles.pfRow}>
                  <Text style={styles.pfLabel}>1D returns</Text>
                  <Text style={[styles.pfNum, { color: dayGain >= 0 ? Corpus.income : Corpus.danger }]}>
                    {hide ? '' : `${dayGain >= 0 ? '+' : '−'}${formatINR(Math.round(Math.abs(dayGain)))} `}({formatPct(pf.value - dayGain > 0 ? (dayGain / (pf.value - dayGain)) * 100 : 0)})
                  </Text>
                </View>
              )}
              <View style={styles.pfRow}>
                <Text style={styles.pfLabel}>Total returns</Text>
                <Text style={[styles.pfNum, { color: totalUp ? Corpus.income : Corpus.danger }]}>
                  {hide ? '' : `${totalUp ? '+' : '−'}${formatINR(Math.abs(Math.round(pf.gain)))} `}({formatPct(pf.pct)})
                </Text>
              </View>
              {xirrAll != null && (
                <View style={styles.pfRow}>
                  <Text style={styles.pfLabel}>XIRR</Text>
                  <Text style={[styles.pfNum, { color: xirrAll >= 0 ? Corpus.income : Corpus.danger }]}>{formatPct(xirrAll).replace(/\.(\d)\d%/, '.$1%')} a year</Text>
                </View>
              )}
              {divs > 0 && (
                <View style={styles.pfRow}>
                  <Text style={styles.pfLabel}>Dividends received</Text>
                  <Text style={[styles.pfNum, { color: Corpus.income }]}>{hide ? HIDDEN : `+${formatINR(divs)}`}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {investments.length > 0 && (
          <View style={{ backgroundColor: Corpus.bg }}>
            <UnderlineTabs value={tab} onChange={setTab} tabs={[
              { value: 'holdings', label: `Holdings (${investments.length})` },
              { value: 'watchlist', label: `Watchlist${watchlist.length ? ` (${watchlist.length})` : ''}` },
              { value: 'sips', label: 'SIPs' },
              { value: 'analysis', label: 'Analysis' },
            ]} />
          </View>
        )}

        {investments.length > 0 && tab === 'holdings' && (
          <Animated.View key="h" entering={FadeIn.duration(120)} style={{ gap: 12 }}>
            <SipCards pending={pending} list={investments} onYes={sipYes} onSkip={sipSkip} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {([['value', 'Current value'], ['returns', 'Returns %'], ['today', 'Today'], ['name', 'A to Z']] as const).map(([k, label]) => (
                <Tap key={k} onPress={() => (sort === k ? setAsc(!asc) : (setSort(k), setAsc(false)))} style={[styles.chip, sort === k && styles.chipOn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]} accessibilityRole="radio" accessibilityState={{ selected: sort === k }} accessibilityHint={sort === k ? 'Tap again to reverse the order' : undefined}>
                  <Text style={[styles.chipText, sort === k && { color: Corpus.onGold }]}>{label}</Text>
                  {sort === k && <Ionicons name={(k === 'name' ? !asc : asc) ? 'arrow-up' : 'arrow-down'} size={12} color={Corpus.onGold} />}
                </Tap>
              ))}
            </ScrollView>
            <View style={[styles.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
              {rows.map(({ h, linked, d }, i) => (
                <HoldingRow key={h.id} d={d} first={i === 0} hide={hide}
                  onPress={() => (linked && targetOf(h) ? setTarget(targetOf(h)) : setMode({ kind: 'edit', h }))}
                  onLongPress={() => setMode({ kind: 'edit', h })}>
                  {!linked && (
                    <View style={styles.actions}>
                      {['mf', 'stock', 'nps', 'crypto', 'goldbond'].includes(h.type) && !liveRefOf(h) && (
                        <Tap onPress={() => { setLinkFor(h); setSearch(searchFor(h)); }} style={[styles.chip, styles.chipOn]}><Text style={[styles.chipText, { color: Corpus.onGold }]}>Get live price</Text></Tap>
                      )}
                      {!currentValue(h).auto && <Tap onPress={() => setMode({ kind: 'value', h })} style={[styles.chip, d.warn && styles.chipOn]}><Text style={[styles.chipText, d.warn && { color: Corpus.onGold }]}>Update value</Text></Tap>}
                      {h.type !== 'fd' && <Tap onPress={() => setMode({ kind: 'add', h })} style={styles.chip}><Text style={styles.chipText}>Add money</Text></Tap>}
                    </View>
                  )}
                  {jars.length > 0 && !jars.find((j) => j.id === h.goalId) && (
                    <Tap onPress={() => setPickFor(h)} style={styles.jarAsk} accessibilityRole="button"><Ionicons name="add-circle-outline" size={13} color={Corpus.gold} /><Text style={styles.jarAskText}>Add to {suggestJar(h, jars)?.jar.name ?? 'a jar'}</Text></Tap>
                  )}
                </HoldingRow>
              ))}
            </View>
            <Text style={styles.note}>Tap a stock or fund to see its chart or record a buy or sale. Press and hold a row to edit it. FD, EPF and PPF grow at their interest rate. Others without a live price show the value you entered.</Text>
          </Animated.View>
        )}

        {investments.length > 0 && tab === 'watchlist' && (
          <Animated.View key="w" entering={FadeIn.duration(120)} style={{ gap: 12 }}>
            {watchlist.length === 0 ? (
              <View style={[styles.card, { alignItems: 'center', gap: 8, paddingVertical: 24 }]}>
                <IconChip icon="eye" color={Chip.indigo} size={44} />
                <Text style={styles.emptyTitle}>Nothing on your watchlist</Text>
                <Text style={[styles.meta, { textAlign: 'center' }]}>Search a stock or fund and tap the star to follow its price here.</Text>
                <Button size="sm" icon="search" label="Search" onPress={() => setSearch('stock')} />
              </View>
            ) : (
              <View style={[styles.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
                {watchlist.map((w, i) => {
                  const ref = parseWatch(w);
                  const x = wp[refKey(ref)];
                  const title = ref.kind === 'stock' ? shortSymbol(ref.id) : x?.name ?? ref.id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
                  const sub = ref.kind === 'stock' ? x?.name ?? 'Stock' : { fund: 'Mutual fund, NAV', nps: 'NPS, NAV', crypto: 'Crypto, 24h' }[ref.kind];
                  return (
                    <HoldingRow key={w} first={i === 0} onPress={() => setTarget({ ...ref, name: x?.name ?? title })}
                      d={{ key: w, title, sub, value: x?.price ?? null, valueIsPrice: true, dayPct: x?.changePct ?? null, dayChange: ref.kind === 'stock' ? x?.change ?? null : null, spark: sparks[refKey(ref)], ltp: x?.price ?? null }} />
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {investments.length > 0 && tab === 'sips' && (
          <Animated.View key="s" entering={FadeIn.duration(120)} style={{ gap: 12 }}>
            <SipCards pending={pending} list={investments} onYes={sipYes} onSkip={sipSkip} />
            <View style={[styles.card, styles.row]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.meta}>Going in every month</Text>
                <Text style={styles.pfNum}>{money(sipMonthly)}</Text>
              </View>
              <Button size="sm" icon="repeat" label="Start a SIP" onPress={() => (setSipPick(true), setSearch('fund'))} />
            </View>
            {sipList.length > 0 && (
              <View style={[styles.card, { padding: 0, gap: 0, overflow: 'hidden' }]}>
                {sipList.map((h, i) => {
                  const ns = nextSip(h);
                  const st = sipStreak(h);
                  return (
                    <HoldingRow key={h.id} first={i === 0} hide={hide} onPress={() => setSipFor(h)}
                      d={{ key: h.id, title: h.name, sub: h.sip!.active ? `On the ${dayLabel(h.sip!.day)}${ns ? `, next ${ns.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}` : 'Stopped',
                        value: sipAmount(h.sip!, new Date()), valueIsPrice: false, note: st && st.streak > 1 ? `${st.streak} in a row${st.skipped ? `, ${st.skipped} missed this year` : ''}` : st?.skipped ? `${st.skipped} missed this year` : '' }} />
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}

        {investments.length > 0 && tab === 'analysis' && (
          <Animated.View key="a" entering={FadeIn.duration(120)} style={{ gap: 12 }}>
            {pf.allocation.length > 0 && (
              <MixCard
                allocation={pf.allocation}
                total={pf.value}
                target={settings.mixTarget?.equity}
                history={mixHistory}
                colors={CLASS}
                onTarget={(t) => saveSettings({ mixTarget: { equity: t } }).catch(() => {})}
              />
            )}

            <GoalsCard jars={jars} list={investments} onOpenJar={(id) => router.push({ pathname: '/vault/[id]', params: { id } })} onOpenJars={() => router.push('/vaults')} />

            {fySales.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.name}>Profit booked in FY {fyOf(new Date())}</Text>
                <Text style={[styles.heroValue, { color: booked.total >= 0 ? Corpus.income : Corpus.danger }]}>
                  {booked.total >= 0 ? '+' : '−'}{formatINR(Math.abs(Math.round(booked.total)))}
                </Text>
                {booked.equityShort !== 0 && <Text style={styles.meta}>Short-term equity {formatINR(booked.equityShort)}, taxed 20%</Text>}
                {booked.equityLong !== 0 && <Text style={styles.meta}>Long-term equity {formatINR(booked.equityLong)}. Used {formatINR(booked.exemptionUsed)} of the ₹1.25 L tax-free limit, {formatINR(booked.exemptionLeft)} left</Text>}
                {booked.otherLong !== 0 && <Text style={styles.meta}>Long-term gold and other {formatINR(booked.otherLong)}, taxed 12.5%</Text>}
                {booked.slab !== 0 && <Text style={styles.meta}>Slab-rate gains {formatINR(booked.slab)}</Text>}
                {booked.crypto !== 0 && <Text style={styles.meta}>Crypto {formatINR(booked.crypto)}, taxed 30%</Text>}
                <Text style={[styles.meta, { color: Corpus.text, fontWeight: '600' }]}>Tax on this so far, about {formatINR(booked.tax)}</Text>
                {fySales.slice(0, 5).map((r) => (
                  <Pressable
                    key={r.id}
                    onLongPress={() => {
                      const go = () => deleteRealized(r.id).then(() => showToast({ message: 'Sale record removed' }));
                      if (Platform.OS === 'web') askWeb(`Remove this sale record?\n\nYour ${r.name} holding is not changed.`, 'Remove').then((y) => { if (y) go(); });
                      else Alert.alert('Remove this sale record?', 'Your holding is not changed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
                    }}
                  >
                    <Text style={styles.note}>
                      {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: sold {r.units} {r.name} at {formatPrice(r.sellPrice)}, {r.shortGain + r.longGain >= 0 ? '+' : '−'}{formatINR(Math.abs(r.shortGain + r.longGain))}
                      {r.longGain !== 0 && r.shortGain !== 0 ? ' (part long-term)' : r.longGain !== 0 ? ' (long-term)' : ''}
                    </Text>
                  </Pressable>
                ))}
                {fySales.length > 5 && <Text style={styles.note}>{fySales.length - 5} more sales</Text>}
              </View>
            )}

            {(tax.equityShort > 0 || tax.equityLong !== 0 || tax.otherLong > 0 || tax.slabGains > 0 || tax.crypto > 0) && (
              <View style={styles.card}>
                <Text style={styles.name}>Tax if you sold everything today</Text>
                <Text style={styles.heroValue}>About {formatINR(tax.estimate)}</Text>
                {tax.equityShort > 0 && <Text style={styles.meta}>Short-term equity gains {formatINR(tax.equityShort)}, taxed 20%</Text>}
                {tax.equityLong !== 0 && (
                  <Text style={styles.meta}>
                    Long-term equity gains {formatINR(tax.equityLong)}. The first {formatINR(tax.exemptionLeft)} is tax-free, then 12.5%
                  </Text>
                )}
                {tax.otherLong > 0 && <Text style={styles.meta}>Long-term gold and other fund gains {formatINR(tax.otherLong)}, taxed 12.5%</Text>}
                {tax.slabGains > 0 && <Text style={styles.meta}>Slab-rate gains (debt funds, short-term gold) {formatINR(tax.slabGains)}, counted at 30% here</Text>}
                {tax.crypto > 0 && <Text style={styles.meta}>Crypto gains {formatINR(tax.crypto)}, flat 30%</Text>}
                {tax.equityLong > 0 && (
                  <Text style={[styles.meta, { color: Corpus.income }]}>
                    {tax.equityLong <= tax.exemptionLeft
                      ? `All ${formatINR(tax.equityLong)} of your long-term equity gains are tax-free this year. Booking them before 31 March (sell and buy back) resets your cost and saves tax later.`
                      : `You can book ${formatINR(tax.exemptionLeft)} of long-term equity gains tax-free before 31 March (sell and buy back).`}
                  </Text>
                )}
                <Text style={styles.note}>Rough estimate, including 4% cess. It counts what is left of your ₹1.25 L tax-free limit after this year's sales and leaves out losses carried from past years. Not tax advice.</Text>
              </View>
            )}

            {checkup.length > 0 && (
              <View style={[styles.card, { borderColor: Corpus.warningLine }]}>
                <Text style={styles.name}>Monthly check-up: {checkup.length} to update</Text>
                <Text style={styles.meta}>These have no live price. Type today's value from your app or statement so your net worth stays right.</Text>
                {checkup.map((h) => (
                  <View key={h.id} style={m.posRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={m.rowName} numberOfLines={1}>{h.name}</Text>
                      <Text style={m.small}>{formatINR(h.value)}, {daysOld(h)} days ago</Text>
                    </View>
                    <Button size="sm" variant="secondary" icon="refresh" label="Update" onPress={() => setMode({ kind: 'value', h })} />
                  </View>
                ))}
              </View>
            )}

          </Animated.View>
        )}
      </ScrollView>
      </SafeAreaView>
      {mode && (
        <InvestmentSheet
          mode={mode}
          onClose={() => setMode(null)}
          onSave={save}
          onAddMoney={(h, n) => run(() => addMoney(h, n, currentValue(h).value), `${formatINR(n)} added to ${h.name}`)}
          onUpdateValue={(h, v) => run(() => updateValue(h, v), `${h.name} updated`)}
          onDelete={mode.kind === 'edit' ? () => remove(mode.h) : undefined}
          onSearchLive={(t) => {
            setMode(null);
            setSearch(t === 'mf' ? 'fund' : t === 'nps' ? 'nps' : t === 'crypto' ? 'crypto' : 'stock');
          }}
        />
      )}
      {search && (
        <MarketSearchSheet
          initial={search}
          onClose={() => {
            setSearch(null);
            setLinkFor(null);
            setSipPick(false);
          }}
          onPick={(t) => {
            setSearch(null);
            if (!sipPick) return setTarget(t);
            setSipPick(false);
            // already own it → SIP on that holding; otherwise the holding is created when you save the SIP
            const own = investments.find((h) => liveRefOf(h) && refKey(liveRefOf(h)!) === refKey(t));
            setSipFor(
              own ?? {
                id: '',
                name: (t.name ?? t.id).slice(0, 60),
                type: t.kind === 'nps' ? 'nps' : t.kind === 'stock' ? (/gold|sgb/i.test(`${t.id} ${t.name}`) ? 'goldbond' : 'stock') : 'mf',
                units: 0,
                invested: 0,
                value: 0,
                valueAt: new Date().toISOString(),
                startDate: new Date().toISOString(),
                ...(t.kind === 'stock' ? { symbol: t.id } : t.kind === 'fund' ? { schemeCode: t.id, fundClass: fundClassOf(undefined, t.name) } : t.kind === 'nps' ? { npsCode: t.id } : {}),
              }
            );
          }}
        />
      )}
      {sipFor && (
        <SipSheet
          h={sipFor}
          canBackfill={!!(sipFor.schemeCode || sipFor.npsCode)}
          onClose={() => setSipFor(null)}
          onSave={async (sip, history) => {
            try {
              // new SIP picked from search: create the holding first
              let h = sipFor;
              if (!h.id && sip) {
                const { id: _new, ...rest } = h;
                const plain = Object.fromEntries(Object.entries(sip).filter(([, v]) => v !== undefined)) as typeof sip;
                const id = await addInvestment(history ? rest : { ...rest, sip: plain });
                h = { ...h, id };
                if (!history) {
                  showToast({ message: `SIP of ${formatINR(sip.amount)} into ${h.name} started` });
                  setSipFor(null);
                  return;
                }
              }
              if (sip && history) {
                const b = await saveSipWithHistory(h, sip, history.since, history.alreadyIncluded);
                showToast({
                  message: history.alreadyIncluded
                    ? `${b.entries.length} past SIPs recorded`
                    : `${b.entries.length} past SIPs added: ${b.units} units for ${formatINR(b.invested)}`,
                });
              } else {
                await saveSip(h, sip);
                showToast({ message: sip?.active ? `SIP of ${formatINR(sip.amount)} on the ${dayLabel(sip.day)} saved` : 'SIP stopped' });
              }
              setSipFor(null);
            } catch (e) {
              console.error('SIP save failed', e);
              showToast({ message: history ? 'Could not get past NAVs. Check your internet and try again.' : 'Could not save the SIP. Try again.' });
            }
          }}
        />
      )}
      {pickFor && (
        <JarPickerSheet
          holdings={[pickFor]}
          jars={cashJars}
          onClose={() => setPickFor(null)}
          onSave={async ([p]) => {
            try {
              await linkInvestment(p.id, { goalId: p.jarId ?? undefined });
              setPickFor(null);
              showToast({ message: p.jarId ? `Now saving for ${cashJars.find((j) => j.id === p.jarId)?.name}` : 'Not in a jar' });
            } catch { showToast({ message: 'Couldn’t save. Try again.' }); }
          }}
        />
      )}
      {importing && (
        <ImportSheet
          onClose={() => setImporting(false)}
          onImport={async (list) => {
            try {
              for (const n of list) await addInvestment(n);
              showToast({ message: `${list.length} holding${list.length > 1 ? 's' : ''} added` });
              setImporting(false);
            } catch {
              showToast({ message: 'Some could not be saved. Try again.' });
            }
          }}
        />
      )}
      {target && (
        <QuoteSheet
          key={watchId(target)}
          target={target}
          holding={holdingOf(target)}
          watched={watchlist.includes(watchId(target))}
          onToggleWatch={() => toggleWatch(target)}
          onClose={() => {
            setTarget(null);
            setLinkFor(null);
          }}
          onAddHolding={async (n) => {
            try {
              if (linkFor) {
                await updateInvestment(linkFor.id, { ...n, name: linkFor.name, startDate: linkFor.startDate });
                showToast({ message: `${linkFor.name} now has a live price` });
                setLinkFor(null);
              } else {
                await addInvestment(n);
                showToast({ message: `${n.name} added to your holdings` });
              }
            } catch {
              showToast({ message: 'Could not save. Try again.' });
            }
          }}
          onStartSip={async (n) => {
            try {
              const id = await addInvestment(n);
              setTarget(null);
              setSipForId(id);
            } catch {
              showToast({ message: 'Could not save. Try again.' });
            }
          }}
          onBuy={(h, u, p, d) => run(() => buyUnits(h, u, p, d), `Added ${u} to ${h.name}`)}
          onSell={async (h, u, p) => {
            try {
              const { profit, longProfit } = await sellUnits(h, u, p);
              const short = profit - longProfit;
              showToast({
                message: `Sold ${u}, ${profit >= 0 ? 'profit' : 'loss'} ${formatINR(Math.abs(profit))}${profit > 0 && longProfit > 0 && short > 0 ? ` (${formatINR(longProfit)} long-term)` : profit > 0 ? (longProfit > 0 ? ', long-term' : ', short-term') : ''}`,
              });
            } catch {
              showToast({ message: 'Could not save. Try again.' });
            }
          }}
          onEditHolding={(h, u, inv) => run(() => updateInvestment(h.id, { units: u, invested: inv, lots: [{ date: h.startDate, units: u, price: inv / u }] }), 'Holding updated')}
        />
      )}
    </View>
  );
}

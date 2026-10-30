import { Button, SectionLabel } from '@/components/ui';
import { ChartColors } from '@/constants/chartColors';
import { Corpus, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { isLinked, liveRefOf, useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { saveSettings } from '@/services/settings';
import { addInvestment, addMoney, buyUnits, deleteInvestment, sellUnits, updateInvestment, updateValue } from '@/services/investments';
import { investMeta, type Investment, type NewInvestment } from '@/types/investment';
import { compactINR, formatINR, formatINRLong } from '@/utils/format';
import { currentValue, daysOld, gain, isStale, portfolio, yearlyReturn } from '@/utils/investments';
import { Ionicons } from '@expo/vector-icons';
import { bookedThisYear, portfolioTax } from '@/utils/capitalGains';
import { dividendTotal, fyOf, fyStart } from '@/utils/corporateActions';
import { useRealized } from '@/hooks/useRealized';
import { deleteRealized } from '@/services/realized';
import { formatPct, formatPrice, getLive, parseWatch, priceTime, refKey, shortSymbol, watchId, type LiveKind, type LivePrice } from '@/utils/market';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InvestmentSheet, { type InvSheetMode } from './InvestmentSheet';
import { m } from './Market.styles';
import MarketSearchSheet, { type Target } from './MarketSearchSheet';
import ImportSheet from './ImportSheet';
import SipSheet from './SipSheet';
import { saveSip, saveSipWithHistory } from '@/services/investments';
import { nextSip, sipAmount, sipStreak } from '@/utils/sip';
import MarketStrip from './MarketStrip';
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
  const { showToast } = useToast();
  const { investments, live, liveError, updatedAt, loading } = useInvestments();
  const { settings } = useSettings();
  const [mode, setMode] = useState<InvSheetMode | null>(null);
  const [search, setSearch] = useState<LiveKind | null>(null);
  const [importing, setImporting] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [linkFor, setLinkFor] = useState<Investment | null>(null); // attach a live price to an existing manual holding
  const watchlist = settings.watchlist ?? [];
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
  // SIPs
  const [sipFor, setSipFor] = useState<Investment | null>(null);
  const [sipForId, setSipForId] = useState<string | null>(null); // a fund just added for a SIP → open its SIP sheet once it appears
  useEffect(() => {
    const h = sipForId && investments.find((x) => x.id === sipForId);
    if (h) (setSipFor(h), setSipForId(null));
  }, [sipForId, investments]);


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
    if (Platform.OS === 'web') window.confirm(`Remove ${h.name}?`) && go();
    else Alert.alert(`Remove ${h.name}?`, '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <Text style={styles.heading}>Invest</Text>
          {investments.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button size="sm" variant="secondary" icon="clipboard-outline" label="Import" onPress={() => setImporting(true)} />
              <Button size="sm" icon="add" label="Add" onPress={() => setMode({ kind: 'new' })} />
            </View>
          )}
        </View>

        <MarketStrip onOpen={(symbol, name) => setTarget({ kind: 'stock', id: symbol, name })} />
        <Pressable style={m.search} onPress={() => setSearch('stock')}>
          <Ionicons name="search" size={16} color={Corpus.textMuted} />
          <Text style={m.searchText}>Search stocks, funds, NPS, crypto</Text>
        </Pressable>

        {watchlist.length > 0 && (
          <View style={[styles.card, { paddingVertical: 4, gap: 0 }]}>
            <Text style={[m.tiny, { paddingTop: 10 }]}>WATCHLIST</Text>
            {watchlist.map((w) => {
              const ref = parseWatch(w);
              const x = wp[refKey(ref)];
              const title = ref.kind === 'stock' ? shortSymbol(ref.id) : x?.name ?? ref.id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
              const sub = ref.kind === 'stock' ? x?.name ?? '' : { fund: 'Mutual fund · NAV', nps: 'NPS · NAV', crypto: 'Crypto · 24h' }[ref.kind];
              return (
                <Pressable key={w} style={m.row} onPress={() => setTarget({ ...ref, name: x?.name ?? title })}>
                  <View style={{ flex: 1 }}>
                    <Text style={m.rowName} numberOfLines={1}>{title}</Text>
                    <Text style={m.small} numberOfLines={1}>{sub}</Text>
                  </View>
                  <View style={m.rowRight}>
                    <Text style={m.price}>{formatPrice(x?.price)}</Text>
                    <Text style={[m.small, { color: (x?.changePct ?? 0) >= 0 ? Corpus.income : Corpus.danger }]}>{formatPct(x?.changePct)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 60 }} />
        ) : investments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: Type.hero }}>🌱</Text>
            <Text style={styles.emptyTitle}>All your investments in one place</Text>
            <Text style={styles.emptyText}>
              Mutual funds, stocks, FDs, EPF, PPF, NPS, gold bonds. Add what you have and see what it's worth, what you've gained, and how it's split. Nothing is linked to your bank or demat.
            </Text>
            <Button label="Search & add (live price)" icon="search" onPress={() => setSearch('stock')} style={{ alignSelf: 'stretch', marginTop: 12 }} />
            <Button variant="secondary" label="Paste from Zerodha / Groww / any app" icon="clipboard-outline" onPress={() => setImporting(true)} style={{ alignSelf: 'stretch' }} />
            <Button variant="ghost" label="Add FD, EPF, PPF or other" icon="add" onPress={() => setMode({ kind: 'new' })} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>YOUR INVESTMENTS ARE WORTH</Text>
              <Text style={styles.heroValue}>{formatINRLong(pf.value)}</Text>
              <Text style={styles.heroSub}>{formatINR(pf.invested)} invested</Text>
              <Text style={[styles.heroSub, { color: pf.gain >= 0 ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                {pf.gain >= 0 ? '▲' : '▼'} {formatINR(Math.abs(pf.gain))} ({pf.gain >= 0 ? '+' : '−'}{Math.abs(pf.pct).toFixed(1)}%) overall
              </Text>
              {divs > 0 && <Text style={[styles.heroSub, { color: Corpus.income }]}>+ {formatINR(divs)} dividends received</Text>}
              {hasStockLive && (
                <Text style={[styles.heroSub, { color: dayGain >= 0 ? Corpus.income : Corpus.danger }]}>
                  Today {dayGain >= 0 ? '+' : '−'}{formatINR(Math.round(Math.abs(dayGain))).replace('−', '')} on stocks
                </Text>
              )}
              {Object.keys(live).length > 0 && (
                <Text style={m.tiny}>{liveError ? 'Live prices paused — showing last known values' : `● Live · updated ${priceTime(updatedAt)}`}</Text>
              )}
            </View>

            {pf.allocation.length > 1 && (
              <View style={styles.card}>
                <Text style={styles.name}>How it's split</Text>
                <View style={styles.stack}>
                  {pf.allocation.map((a) => (
                    <View key={a.cls} style={{ flex: Math.max(a.share, 0.02), backgroundColor: CLASS[a.cls].color }} />
                  ))}
                </View>
                <View style={styles.legend}>
                  {pf.allocation.map((a) => (
                    <Text key={a.cls} style={styles.meta}>
                      <Text style={{ color: CLASS[a.cls].color }}>● </Text>
                      {CLASS[a.cls].label} {Math.round(a.share * 100)}%
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {fySales.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.name}>Profit booked in FY {fyOf(new Date())}</Text>
                <Text style={[styles.heroValue, { color: booked.total >= 0 ? Corpus.income : Corpus.danger }]}>
                  {booked.total >= 0 ? '+' : '−'}{formatINR(Math.abs(Math.round(booked.total)))}
                </Text>
                {booked.equityShort !== 0 && <Text style={styles.meta}>Short-term equity {formatINR(booked.equityShort)} · 20%</Text>}
                {booked.equityLong !== 0 && <Text style={styles.meta}>Long-term equity {formatINR(booked.equityLong)} · {formatINR(booked.exemptionUsed)} of ₹1.25 L tax-free used, {formatINR(booked.exemptionLeft)} left</Text>}
                {booked.otherLong !== 0 && <Text style={styles.meta}>Long-term gold / other {formatINR(booked.otherLong)} · 12.5%</Text>}
                {booked.slab !== 0 && <Text style={styles.meta}>Slab-rate gains {formatINR(booked.slab)}</Text>}
                {booked.crypto !== 0 && <Text style={styles.meta}>Crypto {formatINR(booked.crypto)} · 30%</Text>}
                <Text style={[styles.meta, { color: Corpus.text, fontWeight: '600' }]}>Tax on this so far ≈ {formatINR(booked.tax)}</Text>
                {fySales.slice(0, 5).map((r) => (
                  <Pressable
                    key={r.id}
                    onLongPress={() => {
                      const go = () => deleteRealized(r.id).then(() => showToast({ message: 'Sale record removed' }));
                      if (Platform.OS === 'web') window.confirm(`Remove this sale record of ${r.name}? (Holding is not changed)`) && go();
                      else Alert.alert('Remove this sale record?', 'Your holding is not changed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: go }]);
                    }}
                  >
                    <Text style={styles.note}>
                      {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · sold {r.units} {r.name} at {formatPrice(r.sellPrice)} → {r.shortGain + r.longGain >= 0 ? '+' : '−'}{formatINR(Math.abs(r.shortGain + r.longGain))}
                      {r.longGain !== 0 && r.shortGain !== 0 ? ' (part long-term)' : r.longGain !== 0 ? ' (long-term)' : ''}
                    </Text>
                  </Pressable>
                ))}
                {fySales.length > 5 && <Text style={styles.note}>+ {fySales.length - 5} more sales</Text>}
              </View>
            )}

            {(tax.equityShort > 0 || tax.equityLong !== 0 || tax.otherLong > 0 || tax.slabGains > 0 || tax.crypto > 0) && (
              <View style={styles.card}>
                <Text style={styles.name}>Tax if you sold everything today</Text>
                <Text style={styles.heroValue}>≈ {formatINR(tax.estimate)}</Text>
                {tax.equityShort > 0 && <Text style={styles.meta}>Short-term equity gains {formatINR(tax.equityShort)} · taxed 20%</Text>}
                {tax.equityLong !== 0 && (
                  <Text style={styles.meta}>
                    Long-term equity gains {formatINR(tax.equityLong)} · first {formatINR(tax.exemptionLeft)} a year tax-free, then 12.5%
                  </Text>
                )}
                {tax.otherLong > 0 && <Text style={styles.meta}>Long-term gold / other fund gains {formatINR(tax.otherLong)} · 12.5%</Text>}
                {tax.slabGains > 0 && <Text style={styles.meta}>Slab-rate gains (debt funds, short-term gold) {formatINR(tax.slabGains)} · counted at 30% here</Text>}
                {tax.crypto > 0 && <Text style={styles.meta}>Crypto gains {formatINR(tax.crypto)} · flat 30%</Text>}
                {tax.equityLong > 0 && (
                  <Text style={[styles.meta, { color: Corpus.income }]}>
                    💡 {tax.equityLong <= tax.exemptionLeft
                      ? `All ${formatINR(tax.equityLong)} of your long-term equity gains are tax-free this year. Booking them before 31 March (sell and buy back) resets your cost and saves tax later.`
                      : `You can book ${formatINR(tax.exemptionLeft)} of long-term equity gains tax-free before 31 March (sell and buy back).`}
                  </Text>
                )}
                <Text style={styles.note}>Rough estimate with 4% cess. Uses what's left of your ₹1.25 L after sales this year; ignores losses carried from past years. Not tax advice.</Text>
              </View>
            )}


            <SectionLabel right="Tap to open · hold to edit">HOLDINGS</SectionLabel>
            {[...investments]
              .sort((a, b) => currentValue(b).value - currentValue(a).value)
              .map((h) => {
                const meta = investMeta(h.type);
                const g = gain(h);
                const cagr = yearlyReturn(h);
                const ns = nextSip(h);
                const streak = h.sip ? sipStreak(h) : null;
                const auto = currentValue(h).auto;
                const linked = isLinked(h);
                const l = live[h.id];
                const old = isStale(h) && !linked;
                return (
                  <Pressable key={h.id} style={styles.card} onPress={() => (linked && targetOf(h) ? setTarget(targetOf(h)) : setMode({ kind: 'edit', h }))} onLongPress={() => setMode({ kind: 'edit', h })}>
                    <View style={styles.top}>
                      <View style={styles.icon}>
                        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={Corpus.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{h.name}</Text>
                        <Text style={[styles.meta, old && { color: Corpus.warning }]}>
                          {linked
                            ? `${Math.round(h.units! * 1000) / 1000} ${h.type === 'stock' ? 'shares' : h.type === 'crypto' ? 'coins' : 'units'} · ${l ? formatPrice(l.price) : 'last known'}`
                            : `${meta.label} · ${auto ? `grows at ${h.rate}%` : daysOld(h) <= 0 ? 'updated today' : `updated ${daysOld(h)}d ago`}`}
                        </Text>
                        {l?.changePct != null && (
                          <Text style={[styles.meta, { color: l.changePct >= 0 ? Corpus.income : Corpus.danger }]}>
                            {l.changePct >= 0 ? '▲' : '▼'} {formatPct(l.changePct)} {l.kind === 'stock' ? 'today' : l.kind === 'crypto' ? '24h' : 'last NAV'}
                          {dividendTotal(h) > 0 ? ` · ₹${dividendTotal(h).toLocaleString('en-IN')} dividends` : ''}
                            {l.dayGain != null ? ` · ${l.dayGain >= 0 ? '+' : '−'}${formatINR(Math.round(Math.abs(l.dayGain))).replace('−', '')}` : ''}
                          </Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.value}>{compactINR(g.value)}</Text>
                        <Text style={[styles.meta, { textAlign: 'right', color: g.gain >= 0 ? Corpus.income : Corpus.danger }]}>
                          {g.gain >= 0 ? '+' : '−'}{compactINR(Math.abs(g.gain)).replace('−', '')} ({Math.abs(g.pct).toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                    {cagr !== null && <Text style={styles.note}>About {cagr.toFixed(1)}% a year since {new Date(h.startDate).getFullYear()} (rough, ignores SIP timing)</Text>}
                    {h.sip && (
                      <Text style={[styles.note, { color: h.sip.active ? Corpus.textMuted : Corpus.textFaint }]}>
                        ↻ SIP {formatINR(sipAmount(h.sip, new Date()))} on the {h.sip.day === 1 ? '1st' : `${h.sip.day}th`}
                        {h.sip.active ? (ns ? ` · next ${ns.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '') : ' · stopped'}
                        {streak && streak.streak > 1 ? ` · ${streak.streak} in a row` : ''}
                        {streak && streak.skipped ? ` · ${streak.skipped} missed this year` : ''}
                      </Text>
                    )}
                    {linked ? (
                      ['mf', 'stock', 'nps', 'goldbond'].includes(h.type) && (
                        <View style={styles.actions}>
                          <Button size="sm" variant="secondary" icon="repeat" label={h.sip ? 'SIP' : 'Set up SIP'} onPress={() => setSipFor(h)} />
                        </View>
                      )
                    ) : (
                    <View style={styles.actions}>
                      {['mf', 'nps', 'ppf', 'goldbond', 'stock'].includes(h.type) && (
                        <Button size="sm" variant="secondary" icon="repeat" label="SIP" onPress={() => setSipFor(h)} />
                      )}
                      {['mf', 'stock', 'nps', 'crypto', 'goldbond'].includes(h.type) && !liveRefOf(h) && (
                        <Button size="sm" variant="primary" icon="pulse" label="Get live price" onPress={() => { setLinkFor(h); setSearch(searchFor(h)); }} />
                      )}
                      {h.type !== 'fd' && <Button size="sm" variant="secondary" icon="add" label="Add money" onPress={() => setMode({ kind: 'add', h })} />}
                      {!auto && <Button size="sm" variant={old ? 'primary' : 'secondary'} icon="refresh" label="Update value" onPress={() => setMode({ kind: 'value', h })} />}
                      {(h.type === 'epf' || h.type === 'ppf') && <Button size="sm" variant="secondary" icon="refresh" label="New passbook balance" onPress={() => setMode({ kind: 'value', h })} />}
                    </View>
                    )}
                  </Pressable>
                );
              })}

            <Text style={styles.note}>
              ℹ️ Stocks and funds linked to a live price update by themselves (units × price). FD, EPF and PPF grow on their own at their interest rate; the rest are what you enter. "Add money" is new savings; "Update value" is a gain or loss. All of this counts in your net worth.
            </Text>
          </>
        )}
      </ScrollView>
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
          }}
          onPick={(t) => {
            setSearch(null);
            setTarget(t);
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
              if (sip && history) {
                const b = await saveSipWithHistory(sipFor, sip, history.since, history.alreadyIncluded);
                showToast({
                  message: history.alreadyIncluded
                    ? `${b.entries.length} past SIPs recorded`
                    : `${b.entries.length} past SIPs added · ${b.units} units for ${formatINR(b.invested)}`,
                });
              } else {
                await saveSip(sipFor, sip);
                showToast({ message: sip?.active ? `SIP of ${formatINR(sip.amount)} on the ${sip.day === 1 ? '1st' : `${sip.day}th`} saved` : 'SIP stopped' });
              }
              setSipFor(null);
            } catch (e) {
              showToast({ message: e instanceof Error && /NAV/.test(e.message) ? e.message : 'Could not get past NAVs. Check your internet and try again.' });
            }
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
                message: `Sold ${u} · ${profit >= 0 ? 'profit' : 'loss'} ${formatINR(Math.abs(profit))}${profit > 0 && longProfit > 0 && short > 0 ? ` (${formatINR(longProfit)} long-term)` : profit > 0 ? (longProfit > 0 ? ' · long-term' : ' · short-term') : ''}`,
              });
            } catch {
              showToast({ message: 'Could not save. Try again.' });
            }
          }}
          onEditHolding={(h, u, inv) => run(() => updateInvestment(h.id, { units: u, invested: inv, lots: [{ date: h.startDate, units: u, price: inv / u }] }), 'Holding updated')}
        />
      )}
    </SafeAreaView>
  );
}

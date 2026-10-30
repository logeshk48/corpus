import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { InvestType, Investment, NewInvestment } from '@/types/investment';
import { CLASS_LABEL, holdingTax } from '@/utils/capitalGains';
import { dividendTotal } from '@/utils/corporateActions';
import { formatINR } from '@/utils/format';
import {
  compactNum, formatChange, formatPct, formatPrice, fundClassOf, getChart, getCoinChart, getCoins, getNavChart, getNavs, getNps, getNpsChart,
  marketStatus, priceOn, priceTime, rangeReturn, shortSymbol, exchangeOf, type LiveKind, type Point, type Quote, type Range,
} from '@/utils/market';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Target } from './MarketSearchSheet';
import PriceChart from './PriceChart';
import { m } from './Market.styles';

type Trade = 'add' | 'buy' | 'sell' | 'edit';
type Props = {
  target: Target;
  holding?: Investment;          // your linked holding of this (live-valued), if any
  watched: boolean;
  onToggleWatch?: () => void;
  onAddHolding: (h: NewInvestment) => Promise<void>;
  onBuy: (h: Investment, units: number, price: number, date: string) => Promise<void>;
  onSell: (h: Investment, units: number, price: number) => Promise<void>;
  onEditHolding: (h: Investment, units: number, invested: number) => Promise<void>;
  onStartSip?: (h: NewInvestment) => Promise<void>; // new SIP in something you don't own yet
  onClose: () => void;
};
// Everything the sheet shows, whatever the source
type Info = {
  name?: string; sub?: string; price: number | null; change: number | null; changePct: number | null; time: string | null;
  prevClose?: number | null; dayHigh?: number | null; dayLow?: number | null; high52?: number | null; low52?: number | null;
  volume?: number | null; marketCap?: number | null; house?: string; category?: string; returns?: Record<string, number | null>;
};
const RANGES: Record<LiveKind, Range[]> = {
  stock: ['1d', '5d', '1mo', '6mo', '1y', '5y'],
  crypto: ['1d', '5d', '1mo', '6mo', '1y'],
  fund: ['1mo', '6mo', '1y', '5y'],
  nps: ['1mo', '6mo', '1y', '5y'],
};
const LABEL: Record<Range, string> = { '1d': '1D', '5d': '1W', '1mo': '1M', '6mo': '6M', '1y': '1Y', '5y': '5Y' };
const UNIT: Record<LiveKind, string> = { stock: 'shares', fund: 'units', nps: 'units', crypto: 'coins' };
const SOURCE: Record<LiveKind, string> = {
  stock: 'Prices from Yahoo Finance, may be delayed a few minutes.',
  fund: 'NAV from AMFI (via mfapi.in), published once a day after 9 PM.',
  nps: 'NAV from NSDL / NPS Trust (via npsnav.in), published once a day.',
  crypto: 'Prices from CoinGecko in ₹ (global average; your exchange may differ slightly). Crypto gains are taxed at a flat 30% + 1% TDS on sales.',
};
const num = (t: string) => t.replace(/[^0-9.]/g, '');

async function loadInfo(t: Target, range: Range): Promise<{ info: Info; points: Point[] }> {
  if (t.kind === 'stock') {
    const c = await getChart(t.id, range);
    const q: Quote = c.quote;
    return { info: { ...q, name: q.name, sub: `${shortSymbol(t.id)} · ${q.exchange || exchangeOf(t.id)}` }, points: c.points };
  }
  if (t.kind === 'fund') {
    const [n, c] = await Promise.all([getNavs([t.id]), getNavChart(t.id, range)]);
    const x = n[t.id];
    return { info: { name: x?.name, sub: [x?.house, x?.category?.replace(/^.*?-\s*/, '')].filter(Boolean).join(' · '), price: x?.nav ?? null, change: x?.change ?? null, changePct: x?.changePct ?? null, time: x?.date ?? null, house: x?.house, category: x?.category }, points: c.points };
  }
  if (t.kind === 'nps') {
    const [n, c] = await Promise.all([getNps([t.id]), getNpsChart(t.id, range)]);
    const x = n[t.id];
    return { info: { name: x?.name, sub: x?.house ?? 'NPS', price: x?.nav ?? null, change: x?.change ?? null, changePct: x?.changePct ?? null, time: x?.date ?? null, house: x?.house, returns: x?.returns }, points: c.points };
  }
  const [cs, c] = await Promise.all([getCoins([t.id]), getCoinChart(t.id, range)]);
  const x = cs[t.id];
  return { info: { name: t.name, sub: 'Crypto · price in ₹', price: x?.price ?? null, change: x?.change ?? null, changePct: x?.changePct ?? null, time: x?.time ?? null, volume: x?.volume, marketCap: x?.marketCap }, points: c.points };
}

// What kind of holding to create
function typeFor(t: Target, name: string): InvestType {
  if (t.kind === 'crypto') return 'crypto';
  if (t.kind === 'nps') return 'nps';
  if (t.kind === 'fund') return 'mf';
  return /gold|sgb/i.test(`${t.id} ${name}`) ? 'goldbond' : 'stock';
}

export default function QuoteSheet({ target, holding, watched, onToggleWatch, onAddHolding, onBuy, onSell, onEditHolding, onStartSip, onClose }: Props) {
  const kind = target.kind;
  const isIndex = kind === 'stock' && target.id.startsWith('^');
  const live = kind === 'stock' || kind === 'crypto';
  const [range, setRange] = useState<Range>(live ? '1d' : '1y');
  const [info, setInfo] = useState<Info | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [trade, setTrade] = useState<Trade | null>(null);

  const load = async (r: Range) => {
    setLoading(true);
    try {
      const d = await loadInfo(target, r);
      setInfo(d.info);
      setPoints(d.points);
      setErr(false);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(range);
    if (!live || range !== '1d' || (kind === 'stock' && !marketStatus().open)) return;
    const t = setInterval(() => load('1d'), 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const name = info?.name ?? target.name ?? target.id;
  const price = info?.price ?? null;
  const rr = rangeReturn(points);
  const showDay = range === '1d' || !live;
  const up = ((showDay ? info?.changePct : rr) ?? 0) >= 0;
  const tax = holding ? holdingTax(holding) : null;

  const pos = holding?.units && price
    ? (() => {
        const value = holding.units * price;
        const pl = value - holding.invested;
        return { value, pl, pct: holding.invested ? (pl / holding.invested) * 100 : 0, avg: holding.invested / holding.units, today: info?.change != null ? info.change * holding.units : null };
      })()
    : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title} numberOfLines={2}>{name}</Text>
              <Text style={sheet.subtitle} numberOfLines={1}>{info?.sub ?? ' '}</Text>
            </View>
            {onToggleWatch && !isIndex && (
              <Pressable style={sheet.closeButton} onPress={onToggleWatch} hitSlop={8}>
                <Ionicons name={watched ? 'star' : 'star-outline'} size={18} color={watched ? Corpus.gold : Corpus.textMuted} />
              </Pressable>
            )}
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {err && !price ? (
              <View style={{ paddingVertical: 16, gap: 10 }}>
                <Text style={[m.small, { textAlign: 'center' }]}>
                  {kind === 'stock'
                    ? 'No live price for this one. Some SME stocks, gold bonds and small BSE companies aren’t covered by our free price source.'
                    : 'Couldn’t load live data right now.'}
                </Text>
                <Button size="sm" variant="secondary" icon="refresh" label="Try again" onPress={() => load(range)} />
                {kind === 'stock' && !holding && !trade && (
                  <Button icon="add" label="I own this — add with my own price" onPress={() => setTrade('add')} />
                )}
                {trade === 'add' && (
                  <TradeForm
                    trade="add"
                    target={target}
                    price={null}
                    onCancel={() => setTrade(null)}
                    onDone={async (units, p, date) => {
                      await onAddHolding({
                        name: name.slice(0, 60),
                        type: typeFor(target, name),
                        units,
                        invested: Math.round(units * p),
                        value: Math.round(units * p),
                        valueAt: new Date().toISOString(),
                        startDate: date,
                        lots: [{ date, units, price: p }],
                        symbol: target.id,
                      });
                      setTrade(null);
                    }}
                  />
                )}
                {kind === 'stock' && <Text style={m.tiny}>It’ll show your buy value until a price is available. Long-press it in Holdings to update the value yourself.</Text>}
              </View>
            ) : (
              <>
                <View style={{ gap: 2 }}>
                  <Text style={m.bigPrice}>{isIndex ? price?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—' : formatPrice(price)}</Text>
                  <Text style={[m.small, { color: up ? Corpus.income : Corpus.danger, fontWeight: '600' }]}>
                    {showDay
                      ? info?.change == null ? ' ' : `${up ? '▲' : '▼'} ${formatChange(info.change)} (${formatPct(info.changePct)}) ${kind === 'stock' ? 'today' : kind === 'crypto' ? 'in 24h' : 'since last NAV'}`
                      : `${up ? '▲' : '▼'} ${formatPct(rr)} in ${LABEL[range]}`}
                  </Text>
                  <Text style={m.tiny}>
                    {kind === 'stock' && info?.time && Date.now() - new Date(info.time).getTime() > 5 * 86_400_000
                      ? `⚠ Last traded ${new Date(info.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — rarely traded, price may be old`
                      : kind === 'stock'
                      ? `${marketStatus().open ? 'Live' : 'At last close'} · ${priceTime(info?.time)}${(info as { source?: string })?.source === 'BSE' ? ' · BSE' : ''}`
                      : kind === 'crypto'
                        ? `Live · ${priceTime(info?.time)}`
                        : `NAV as of ${info?.time ? new Date(info.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}`}
                  </Text>
                </View>

                {loading && !points.length ? <ActivityIndicator color={Corpus.gold} style={{ height: 140 }} /> : <PriceChart points={points} base={kind === 'stock' && range === '1d' ? info?.prevClose : undefined} />}
                <View style={m.ranges}>
                  {RANGES[kind].map((r) => (
                    <Pressable key={r} style={[m.range, range === r && m.rangeOn]} onPress={() => setRange(r)}>
                      <Text style={[m.rangeText, range === r && { color: Corpus.gold }]}>{LABEL[r]}</Text>
                    </Pressable>
                  ))}
                </View>

                {info && <Stats kind={kind} info={info} rr={range !== '1d' ? rr : null} rangeLabel={LABEL[range]} isIndex={isIndex} />}

                {pos && holding && !trade && (
                  <View style={m.position}>
                    <Text style={[m.cellLabel, { color: Corpus.gold }]}>YOUR HOLDING</Text>
                    <Row l={`${trim(holding.units!)} ${UNIT[kind]} · avg ${formatPrice(pos.avg)}`} r={formatINR(Math.round(pos.value))} />
                    <Row l={`Invested ${formatINR(holding.invested)}`} r={`${sign(pos.pl)}${formatINR(Math.round(Math.abs(pos.pl)))} (${formatPct(pos.pct)})`} color={pos.pl >= 0 ? Corpus.income : Corpus.danger} />
                    {pos.today != null && <Row l={kind === 'stock' ? 'Today' : kind === 'crypto' ? 'Last 24h' : 'Last NAV change'} r={`${sign(pos.today)}${formatINR(Math.round(Math.abs(pos.today)))}`} color={pos.today >= 0 ? Corpus.income : Corpus.danger} />}
                    {dividendTotal(holding) > 0 && (
                      <>
                        <Row l={`Dividends received (${holding.dividends!.length})`} r={`+${formatINR(dividendTotal(holding))}`} color={Corpus.income} />
                        <Row
                          l="Total return incl. dividends"
                          r={`${sign(pos.pl + dividendTotal(holding))}${formatINR(Math.round(Math.abs(pos.pl + dividendTotal(holding))))} (${formatPct(holding.invested ? ((pos.pl + dividendTotal(holding)) / holding.invested) * 100 : 0)})`}
                          color={pos.pl + dividendTotal(holding) >= 0 ? Corpus.income : Corpus.danger}
                        />
                        <Text style={m.tiny}>
                          Last: ₹{holding.dividends![holding.dividends!.length - 1].perShare} a share on {new Date(holding.dividends![holding.dividends!.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Dividends are taxed at your slab rate; 10% TDS above ₹10,000 a year per company.
                        </Text>
                      </>
                    )}
                    {holding.actions?.map((a) => (
                      <Text key={a.date} style={m.tiny}>
                        ↻ Adjusted for {a.ratio > 1 ? `a ${a.label.replace(':', '-for-')} split/bonus` : `a ${a.label} consolidation`} on {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: shares ×{Math.round(a.ratio * 100) / 100}, buy price ÷{Math.round(a.ratio * 100) / 100}.
                      </Text>
                    ))}
                    {tax && (
                      <>
                        <View style={{ height: 0.5, backgroundColor: Corpus.border, marginVertical: 2 }} />
                        <Text style={m.cellLabel}>TAX IF YOU SELL TODAY · {CLASS_LABEL[tax.cls].toUpperCase()}</Text>
                        {tax.cls === 'crypto' ? (
                          <Text style={m.small}>Flat 30% (+4% cess) on any profit, no matter how long you held. Losses can’t be set off.</Text>
                        ) : tax.cls === 'debt' ? (
                          <Text style={m.small}>Taxed at your income slab rate, however long you hold (debt funds bought after Apr 2023).</Text>
                        ) : (
                          <>
                            {tax.shortGain !== 0 && <Row l="Short-term gain" r={`${sign(tax.shortGain)}${formatINR(Math.abs(tax.shortGain))}`} color={tax.shortGain >= 0 ? Corpus.text : Corpus.danger} />}
                            {tax.longGain !== 0 && <Row l="Long-term gain" r={`${sign(tax.longGain)}${formatINR(Math.abs(tax.longGain))}`} color={tax.longGain >= 0 ? Corpus.text : Corpus.danger} />}
                            <Text style={m.tiny}>
                              {tax.cls === 'equity'
                                ? 'Short-term (≤ 1 year): 20%. Long-term: 12.5% above ₹1.25 lakh a year, which is tax-free.'
                                : tax.cls === 'gold-listed'
                                  ? 'Long-term after 1 year: 12.5%. Short-term: your slab rate. SGBs held to maturity are tax-free.'
                                  : 'Long-term after 2 years: 12.5%. Short-term: your slab rate.'}
                            </Text>
                            {tax.turnsLongOn && tax.waitSaves ? (
                              <Text style={[m.small, { color: Corpus.warning }]}>
                                ⏳ Some of this turns long-term on {new Date(tax.turnsLongOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Selling after that could save about {formatINR(tax.waitSaves)}.
                              </Text>
                            ) : null}
                          </>
                        )}
                      </>
                    )}
                  </View>
                )}

                {trade ? (
                  <TradeForm
                    trade={trade}
                    target={target}
                    price={price}
                    holding={holding}
                    onCancel={() => setTrade(null)}
                    onDone={async (units, p, date) => {
                      if (trade === 'add') {
                        const type = typeFor(target, name);
                        await onAddHolding({
                          name: name.slice(0, 60),
                          type,
                          units,
                          invested: Math.round(units * p),
                          value: Math.round(units * (price ?? p)),
                          valueAt: new Date().toISOString(),
                          startDate: date,
                          lots: [{ date, units, price: p }],
                          ...(kind === 'stock' ? { symbol: target.id } : kind === 'fund' ? { schemeCode: target.id, fundClass: fundClassOf(info?.category, name) } : kind === 'nps' ? { npsCode: target.id } : { coinId: target.id }),
                        });
                      } else if (holding && trade === 'buy') await onBuy(holding, units, p, date);
                      else if (holding && trade === 'sell') await onSell(holding, units, p);
                      else if (holding && trade === 'edit') await onEditHolding(holding, units, Math.round(units * p));
                      setTrade(null);
                    }}
                  />
                ) : !isIndex && price ? (
                  holding ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button style={{ flex: 1 }} icon="add" label="Bought more" onPress={() => setTrade('buy')} />
                      <Button style={{ flex: 1 }} variant="secondary" icon="remove" label="Sold" onPress={() => setTrade('sell')} />
                      <Button variant="ghost" icon="create-outline" label="Fix" onPress={() => setTrade('edit')} />
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <Button icon="add" label="I own this — add to my holdings" onPress={() => setTrade('add')} />
                      {onStartSip && (kind === 'fund' || kind === 'nps' || kind === 'stock') && (
                        <Button
                          variant="secondary"
                          icon="repeat"
                          label="Starting a SIP in this (no units yet)"
                          onPress={() =>
                            onStartSip({
                              name: name.slice(0, 60),
                              type: typeFor(target, name),
                              units: 0,
                              invested: 0,
                              value: 0,
                              valueAt: new Date().toISOString(),
                              startDate: new Date().toISOString(),
                              ...(kind === 'stock' ? { symbol: target.id } : kind === 'fund' ? { schemeCode: target.id, fundClass: fundClassOf(info?.category, name) } : { npsCode: target.id }),
                            })
                          }
                        />
                      )}
                    </View>
                  )
                ) : null}
                <Text style={m.tiny}>{SOURCE[kind]} For tracking only — not investment advice.</Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Stats({ kind, info, rr, rangeLabel, isIndex }: { kind: LiveKind; info: Info; rr: number | null; rangeLabel: string; isIndex: boolean }) {
  const fmt = (n?: number | null) => (isIndex ? n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '—' : formatPrice(n));
  if (kind === 'stock')
    return (
      <View style={m.grid}>
        <Cell label="PREV. CLOSE" value={fmt(info.prevClose)} />
        <Cell label="VOLUME" value={isIndex ? '—' : compactNum(info.volume)} />
        <RangeCell label="TODAY’S RANGE" lo={info.dayLow} hi={info.dayHigh} now={info.price} fmt={fmt} />
        <RangeCell label="52-WEEK RANGE" lo={info.low52} hi={info.high52} now={info.price} fmt={fmt} />
        {info.high52 && info.price ? <Cell label="FROM 52W HIGH" value={formatPct(((info.price - info.high52) / info.high52) * 100)} /> : null}
        {rr != null ? <Cell label={`RETURN (${rangeLabel})`} value={formatPct(rr)} /> : null}
      </View>
    );
  if (kind === 'crypto')
    return (
      <View style={m.grid}>
        <Cell label="MARKET CAP" value={info.marketCap ? `₹${compactNum(info.marketCap)}` : '—'} />
        <Cell label="24H VOLUME" value={info.volume ? `₹${compactNum(info.volume)}` : '—'} />
        {rr != null ? <Cell label={`RETURN (${rangeLabel})`} value={formatPct(rr)} /> : null}
      </View>
    );
  return (
    <View style={m.grid}>
      <Cell label="NAV" value={formatPrice(info.price)} />
      <Cell label={`RETURN (${rangeLabel})`} value={formatPct(rr) || '—'} />
      {info.returns?.['3Y'] != null && <Cell label="3Y (A YEAR)" value={formatPct(info.returns['3Y'])} />}
      {info.returns?.['5Y'] != null && <Cell label="5Y (A YEAR)" value={formatPct(info.returns['5Y'])} />}
      <Cell label={kind === 'nps' ? 'PENSION FUND' : 'FUND HOUSE'} value={info.house ?? '—'} />
      {kind === 'fund' && <Cell label="CATEGORY" value={(info.category ?? '—').replace(/^.*?-\s*/, '')} />}
    </View>
  );
}

// ─── Buy / sell / add form, with "when did you buy" → price on that day ───
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ago = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return iso(d);
};
const QUICK = [
  { label: 'Today', months: 0 },
  { label: '1 month ago', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
];
// "14/08/2026" → "2026-08-14"
function parseDMY(t: string) {
  const m2 = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t.trim());
  if (!m2) return null;
  const d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
  return isNaN(d.getTime()) || d > new Date() ? null : iso(d);
}
const toDMY = (d: string) => d.split('-').reverse().join('/');

function TradeForm({ trade, target, price, holding, onCancel, onDone }: { trade: Trade; target: Target; price: number | null; holding?: Investment; onCancel: () => void; onDone: (units: number, price: number, date: string) => Promise<void> }) {
  const avg = holding?.units ? holding.invested / holding.units : null;
  const dated = trade === 'add' || trade === 'buy';
  const [units, setUnits] = useState(trade === 'edit' && holding?.units ? String(holding.units) : '');
  const [p, setP] = useState(trade === 'edit' && avg ? avg.toFixed(2) : price ? String(price) : '');
  const [date, setDate] = useState(iso(new Date()));
  const [dateText, setDateText] = useState(toDMY(iso(new Date())));
  const [priceNote, setPriceNote] = useState<string | null>(dated ? 'Today’s price' : null);
  const [fetching, setFetching] = useState(false);
  const typed = useRef(false); // stop auto-filling once the user types a price
  const [busy, setBusy] = useState(false);

  const pickDate = async (d: string) => {
    setDate(d);
    setDateText(toDMY(d));
    if (typed.current) return;
    if (d === iso(new Date())) {
      if (price) setP(String(price));
      setPriceNote('Today’s price');
      return;
    }
    setFetching(true);
    try {
      const r = await priceOn(target, d);
      if (r.price && !typed.current) {
        setP(r.price.toFixed(2));
        setPriceNote(`Closing price on ${new Date(r.date ?? d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} — change it if you paid a different price`);
      } else setPriceNote('Couldn’t find the price for that day — type what you paid');
    } catch {
      setPriceNote('Couldn’t fetch the old price — type what you paid');
    } finally {
      setFetching(false);
    }
  };

  const u = Number(units), pr = Number(p);
  const over = trade === 'sell' && holding?.units != null && u > holding.units + 1e-9;
  const ok = u > 0 && pr > 0 && !over;
  const word = UNIT[target.kind].toUpperCase();
  const title = { add: 'Add to my holdings', buy: 'I bought more', sell: 'I sold', edit: 'Fix my holding' }[trade];
  const priceLabel = trade === 'sell' ? 'SOLD AT (EACH)' : trade === 'buy' ? 'BOUGHT AT (EACH)' : trade === 'edit' ? 'AVERAGE BUY PRICE' : target.kind === 'fund' || target.kind === 'nps' ? 'NAV YOU BOUGHT AT' : 'BUY PRICE (EACH)';
  const profit = trade === 'sell' && avg ? (pr - avg) * u : null;
  return (
    <View style={[m.position, { gap: 10 }]}>
      <Text style={[m.cellLabel, { color: Corpus.gold }]}>{title.toUpperCase()}</Text>
      {dated && (
        <View style={{ gap: 6 }}>
          <Text style={f.label}>WHEN DID YOU BUY?</Text>
          <View style={sheet.chips}>
            {QUICK.map((q) => {
              const d = q.months === 0 ? iso(new Date()) : ago(q.months);
              return (
                <Pressable key={q.label} style={[sheet.chip, date === d && sheet.chipSuggested]} onPress={() => pickDate(d)}>
                  <Text style={[sheet.chipText, date === d && sheet.chipTextSuggested]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={f.input}
            value={dateText}
            onChangeText={(t) => {
              setDateText(t);
              const d = parseDMY(t);
              if (d) pickDate(d);
            }}
            placeholder="Exact date: DD/MM/YYYY"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={[f.field, { flex: 1 }]}>
          <Text style={f.label}>{word}{trade === 'sell' && holding?.units ? ` (OF ${trim(holding.units)})` : ''}</Text>
          <TextInput style={f.input} value={units} onChangeText={(t) => setUnits(num(t))} placeholder="0" placeholderTextColor={Corpus.textFaint} keyboardType="decimal-pad" />
        </View>
        <View style={[f.field, { flex: 1 }]}>
          <Text style={f.label}>{priceLabel}</Text>
          <TextInput
            style={f.input}
            value={fetching ? '…' : p}
            onChangeText={(t) => {
              typed.current = true;
              setPriceNote(null);
              setP(num(t));
            }}
            placeholder="₹"
            placeholderTextColor={Corpus.textFaint}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {priceNote && <Text style={m.tiny}>{priceNote}</Text>}
      <Text style={m.small}>
        {over
          ? `You only have ${trim(holding!.units!)}.`
          : u > 0 && pr > 0
            ? trade === 'sell'
              ? `You get about ${formatINR(Math.round(u * pr))}${profit != null ? ` · ${profit >= 0 ? 'profit' : 'loss'} ${formatINR(Math.round(Math.abs(profit)))}` : ''}`
              : `Cost ${formatINR(Math.round(u * pr))}${price && trade !== 'buy' ? ` · worth ${formatINR(Math.round(u * price))} now (${formatPct(((price - pr) / pr) * 100)})` : ''}`
            : target.kind === 'stock'
              ? 'Quantity and average price are in your broker app (Zerodha, Groww, Upstox…) under Holdings.'
              : target.kind === 'crypto'
                ? 'Quantity is in your exchange app (CoinDCX, WazirX, Binance…).'
                : 'Units are in your fund app, CAS statement, or NPS statement (CRA).'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button style={{ flex: 1 }} variant="secondary" label="Cancel" onPress={onCancel} />
        <Button
          style={{ flex: 1 }}
          label="Save"
          loading={busy}
          disabled={!ok || fetching}
          onPress={async () => {
            setBusy(true);
            try {
              await onDone(u, pr, new Date(`${date}T10:00:00+05:30`).toISOString());
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
    </View>
  );
}

const trim = (n: number) => String(Math.round(n * 10000) / 10000);
const sign = (n: number) => (n >= 0 ? '+' : '−');
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={m.cell}>
      <Text style={m.cellLabel}>{label}</Text>
      <Text style={m.cellValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function RangeCell({ label, lo, hi, now, fmt }: { label: string; lo?: number | null; hi?: number | null; now: number | null; fmt: (n?: number | null) => string }) {
  const pos = lo != null && hi != null && now != null && hi > lo ? Math.min(1, Math.max(0, (now - lo) / (hi - lo))) : null;
  return (
    <View style={[m.cell, { paddingRight: 12 }]}>
      <Text style={m.cellLabel}>{label}</Text>
      <Text style={m.cellValueSm} numberOfLines={1}>{fmt(lo)} – {fmt(hi)}</Text>
      {pos != null && (
        <View style={m.bar}>
          <View style={[m.barKnob, { left: `${pos * 100}%` }]} />
        </View>
      )}
    </View>
  );
}
function Row({ l, r, color }: { l: string; r: string; color?: string }) {
  return (
    <View style={m.posRow}>
      <Text style={[m.small, { flex: 1 }]}>{l}</Text>
      <Text style={[m.small, { color: color ?? Corpus.text, fontWeight: '600' }]}>{r}</Text>
    </View>
  );
}

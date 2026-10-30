import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { getStockList, searchCoins, searchFunds, searchListed, searchNps, searchStocks, type CoinHit, type FundHit, type Listed, type LiveKind, type LiveRef, type StockHit } from '@/utils/market';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { m } from './Market.styles';

export type Target = LiveRef & { name?: string };

const POPULAR_STOCKS = ['Reliance', 'HDFC Bank', 'TCS', 'Infosys', 'ITC', 'Tata Motors', 'SBI', 'Nifty BeES'];
const POPULAR_FUNDS = ['Parag Parikh Flexi Cap', 'Nifty 50 Index', 'HDFC Mid Cap', 'SBI Small Cap', 'ELSS', 'Liquid'];
const POPULAR_NPS = ['SBI scheme E tier I', 'HDFC scheme E tier I', 'ICICI scheme E', 'UTI scheme C', 'Central Govt', 'Kotak scheme G'];
const POPULAR_COINS = ['Bitcoin', 'Ethereum', 'Solana', 'XRP', 'USDT', 'Polygon'];
const TABS: { id: LiveKind; label: string; hint: string; popular: string[] }[] = [
  { id: 'stock', label: 'Stocks & ETFs', hint: 'Search NSE / BSE stocks, ETFs, gold ETFs', popular: POPULAR_STOCKS },
  { id: 'fund', label: 'Mutual funds', hint: 'Search mutual funds', popular: POPULAR_FUNDS },
  { id: 'nps', label: 'NPS', hint: 'Fund manager + scheme, e.g. SBI scheme E tier I', popular: POPULAR_NPS },
  { id: 'crypto', label: 'Crypto', hint: 'Search coins (prices in ₹)', popular: POPULAR_COINS },
];

export default function MarketSearchSheet({ initial = 'stock', onPick, onClose }: { initial?: LiveKind; onPick: (t: Target) => void; onClose: () => void }) {
  const [tab, setTab] = useState<LiveKind>(initial);
  const [nps, setNps] = useState<FundHit[]>([]);
  const [coins, setCoins] = useState<CoinHit[]>([]);
  // every listed company, loaded once and searched on the phone
  const [listed, setListed] = useState<Listed[] | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [show, setShow] = useState(100);
  useEffect(() => {
    getStockList().then(setListed).catch(() => setListed(null));
  }, []);
  const [q, setQ] = useState('');
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [funds, setFunds] = useState<FundHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setStocks([]);
      setFunds([]);
      setNps([]);
      setCoins([]);
      return;
    }
    let alive = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        if (tab === 'stock') {
          const local = listed ? searchListed(listed, text) : [];
          // fall back to Yahoo search (indices, anything missing from the lists)
          const r: StockHit[] = local.length
            ? local.map((x) => ({ symbol: x.symbol, name: x.name, exchange: x.exchange, type: x.kind === 'etf' ? 'ETF' : x.kind === 'sme' ? 'SME' : x.kind === 'sgb' ? 'SGB' : 'EQUITY' }))
            : await searchStocks(text);
          alive && setStocks(r);
        } else if (tab === 'nps') {
          const r = await searchNps(text);
          alive && setNps(r);
        } else if (tab === 'crypto') {
          const r = await searchCoins(text);
          alive && setCoins(r);
        } else {
          // Prefer Direct-Growth plans (what most app investors hold), then the rest
          const r = await searchFunds(text);
          const score = (n: string) => (/direct/i.test(n) ? 0 : 2) + (/growth/i.test(n) ? 0 : 1);
          alive && setFunds([...r].sort((a, b) => score(a.name) - score(b.name)));
        }
        alive && setErr(false);
      } catch {
        alive && setErr(true);
      } finally {
        alive && setBusy(false);
      }
    }, tab === 'stock' && listed ? 120 : 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, tab, listed]);

  const list: unknown[] = { stock: stocks, fund: funds, nps, crypto: coins }[tab];
  const meta = TABS.find((t) => t.id === tab)!;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={[sheet.sheet, { height: '92%' }]}>
          <View style={sheet.handle} />
          <View style={m.search}>
            <Ionicons name="search" size={16} color={Corpus.textMuted} />
            <TextInput
              style={m.searchInput}
              value={q}
              onChangeText={setQ}
              placeholder={meta.hint}
              placeholderTextColor={Corpus.textFaint}
              autoFocus
              autoCorrect={false}
            />
            {busy ? <ActivityIndicator size="small" color={Corpus.gold} /> : q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={Corpus.textFaint} /></Pressable>
            ) : null}
          </View>
          <View style={[m.tabs, { marginTop: 10, flexWrap: 'wrap' }]}>
            {TABS.map((t) => (
              <Pressable key={t.id} style={[sheet.chip, tab === t.id && sheet.chipSuggested]} onPress={() => setTab(t.id)}>
                <Text style={[sheet.chipText, tab === t.id && sheet.chipTextSuggested]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{ flexShrink: 1, marginTop: 6 }} keyboardShouldPersistTaps="handled">
            {q.trim().length < 2 && tab === 'stock' && listed ? (
              <View style={{ gap: 8, paddingTop: 10 }}>
                <Text style={m.tiny}>ALL {listed.length.toLocaleString('en-IN')} LISTED COMPANIES & ETFs · BROWSE A–Z</Text>
                <View style={sheet.chips}>
                  {['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((L) => (
                    <Pressable key={L} style={[sheet.chip, { paddingHorizontal: 9 }, letter === L && sheet.chipSuggested]} onPress={() => (setLetter(letter === L ? null : L), setShow(100))}>
                      <Text style={[sheet.chipText, letter === L && sheet.chipTextSuggested]}>{L}</Text>
                    </Pressable>
                  ))}
                </View>
                {!letter ? (
                  <View style={sheet.chips}>
                    {POPULAR_STOCKS.map((p) => (
                      <Pressable key={p} style={sheet.chip} onPress={() => setQ(p)}>
                        <Text style={sheet.chipText}>{p}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  (() => {
                    const all = listed.filter((x) => (letter === '#' ? !/^[a-z]/i.test(x.name) : x.name.toUpperCase().startsWith(letter)));
                    return (
                      <>
                        <Text style={m.tiny}>{all.length} starting with {letter}</Text>
                        {all.slice(0, show).map((x) => (
                          <Pressable key={x.symbol} style={m.row} onPress={() => onPick({ kind: 'stock', id: x.symbol, name: x.name })}>
                            <View style={{ flex: 1 }}>
                              <Text style={m.rowName} numberOfLines={1}>{x.name}</Text>
                              <Text style={m.small}>{x.symbol.replace(/\.(NS|BO)$/, '')} · {x.exchange}{x.kind === 'etf' ? ' · ETF' : x.kind === 'sme' ? ' · SME' : x.kind === 'sgb' ? ' · Gold bond' : ''}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
                          </Pressable>
                        ))}
                        {all.length > show && <Button variant="ghost" label={`Show more (${all.length - show} left)`} onPress={() => setShow(show + 200)} />}
                      </>
                    );
                  })()
                )}
              </View>
            ) : q.trim().length < 2 ? (
              <View style={{ gap: 8, paddingTop: 10 }}>
                <Text style={m.tiny}>POPULAR</Text>
                <View style={sheet.chips}>
                  {meta.popular.map((p) => (
                    <Pressable key={p} style={sheet.chip} onPress={() => setQ(p)}>
                      <Text style={sheet.chipText}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : err ? (
              <Text style={[m.small, { paddingVertical: 20, textAlign: 'center' }]}>Couldn’t reach the market right now. Check your internet and try again.</Text>
            ) : !busy && list.length === 0 ? (
              <Text style={[m.small, { paddingVertical: 20, textAlign: 'center' }]}>Nothing found for “{q}”.</Text>
            ) : tab === 'stock' ? (
              stocks.map((s) => (
                <Pressable key={s.symbol} style={m.row} onPress={() => onPick({ kind: 'stock', id: s.symbol, name: s.name })}>
                  <View style={{ flex: 1 }}>
                    <Text style={m.rowName} numberOfLines={1}>{s.name}</Text>
                    <Text style={m.small}>{s.symbol.replace(/\.(NS|BO)$/, '')} · {s.exchange}{s.type === 'ETF' ? ' · ETF' : s.type === 'SME' ? ' · SME' : s.type === 'SGB' ? ' · Gold bond' : s.type === 'INDEX' ? ' · Index' : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
                </Pressable>
              ))
            ) : tab === 'crypto' ? (
              coins.map((c) => (
                <Pressable key={c.id} style={m.row} onPress={() => onPick({ kind: 'crypto', id: c.id, name: c.name })}>
                  <View style={{ flex: 1 }}>
                    <Text style={m.rowName} numberOfLines={1}>{c.name}</Text>
                    <Text style={m.small}>{c.symbol}{c.rank ? ` · #${c.rank} by market cap` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
                </Pressable>
              ))
            ) : (
              (tab === 'nps' ? nps : funds).map((f) => (
                <Pressable key={f.code} style={m.row} onPress={() => onPick({ kind: tab as 'fund' | 'nps', id: f.code, name: f.name })}>
                  <View style={{ flex: 1 }}>
                    <Text style={m.rowName} numberOfLines={2}>{f.name}</Text>
                    <Text style={m.small}>{tab === 'nps' ? 'NPS' : 'AMFI'} {f.code}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
                </Pressable>
              ))
            )}
            <Text style={[m.tiny, { paddingVertical: 14 }]}>Stocks: Yahoo Finance (may lag a few minutes). Funds: AMFI NAV, once a day. NPS: npsnav.in, once a day. Crypto: CoinGecko, live in ₹.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

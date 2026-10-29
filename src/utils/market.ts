// Live market data (NSE/BSE stocks, indices, mutual fund NAVs).
// Everything goes through our own /api/market function on Vercel (browsers can't call
// Yahoo / mfapi directly). Prices are cached briefly so many screens don't refetch.
import { Platform } from 'react-native';

const PROD = 'https://corpus-fawn-eight.vercel.app';
// On the deployed web app use the same site; on phones / localhost use the deployed one.
const BASE =
  Platform.OS === 'web' && typeof window !== 'undefined' && /vercel\.app$/.test(window.location.hostname)
    ? ''
    : process.env.EXPO_PUBLIC_MARKET_API || PROD;

export type Quote = {
  symbol: string;
  name: string;
  exchange: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  high52: number | null;
  low52: number | null;
  volume: number | null;
  time: string | null;
  error?: string;
};
export type Nav = { code: string; name?: string; house?: string; category?: string; nav: number | null; date: string | null; change: number | null; changePct: number | null; error?: string };
export type StockHit = { symbol: string; name: string; exchange: string; type: string };
export type FundHit = { code: string; name: string };
export type Point = { t: string; c: number };
export type Range = '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y';

export const INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
];

async function call<T>(params: Record<string, string>): Promise<T> {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${BASE}/api/market?${qs}`);
  if (!r.ok) throw new Error(`market ${r.status}`);
  return r.json();
}

// ─── tiny cache: key → { at, data } ───
const cache = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = load()
    .then((d) => {
      cache.set(key, { at: Date.now(), data: d });
      return d;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export async function getQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const list = [...new Set(symbols)].filter(Boolean).sort();
  if (!list.length) return {};
  const { quotes } = await cached(`q:${list}`, 25_000, () => call<{ quotes: Quote[] }>({ op: 'quote', symbols: list.join(',') }));
  return Object.fromEntries(list.map((s, i) => [s, quotes[i]]));
}

export async function getNavs(codes: string[]): Promise<Record<string, Nav>> {
  const list = [...new Set(codes)].filter(Boolean).sort();
  if (!list.length) return {};
  const { navs } = await cached(`n:${list}`, 30 * 60_000, () => call<{ navs: Nav[] }>({ op: 'nav', codes: list.join(',') }));
  return Object.fromEntries(navs.map((n) => [n.code, n]));
}

export const getChart = (symbol: string, range: Range) =>
  cached(`c:${symbol}:${range}`, range === '1d' ? 60_000 : 15 * 60_000, () => call<{ quote: Quote; points: Point[] }>({ op: 'chart', symbol, range }));
export const getNavChart = (code: string, range: Range) =>
  cached(`nc:${code}:${range}`, 60 * 60_000, () => call<{ name: string; points: Point[] }>({ op: 'navchart', code, range }));
export const searchStocks = (q: string) =>
  cached(`s:${q.toLowerCase()}`, 3600_000, () => call<{ results: StockHit[] }>({ op: 'search', q })).then((r) => r.results);
export const searchFunds = (q: string) =>
  cached(`f:${q.toLowerCase()}`, 3600_000, () => call<{ results: FundHit[] }>({ op: 'mfsearch', q })).then((r) => r.results);

// ─── market hours (NSE: Mon–Fri 9:15–15:30 IST; holidays not tracked) ───
export function marketStatus(now = new Date()) {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const open = day >= 1 && day <= 5 && mins >= 555 && mins < 930;
  return { open, label: open ? 'Market open' : day === 0 || day === 6 ? 'Market closed · weekend' : mins < 555 ? 'Opens 9:15 AM' : 'Market closed · 3:30 PM close' };
}

export const shortSymbol = (s: string) => s.replace(/\.(NS|BO)$/, '');
export const exchangeOf = (s: string) => (s.endsWith('.BO') ? 'BSE' : s.startsWith('^') ? 'Index' : 'NSE');

export const formatPrice = (n: number | null | undefined) =>
  n == null ? '—' : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatPts = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPct = (n: number | null | undefined) => (n == null ? '' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2)}%`);
export const formatChange = (n: number | null | undefined) => (n == null ? '' : `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
export function compactNum(n: number | null | undefined) {
  if (n == null) return '—';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
// "2 min ago", "today 3:30 PM", "28 Oct"
export function priceTime(iso: string | null | undefined, now = new Date()) {
  if (!iso) return '';
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `today ${t}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
// return over a chart's points
export const rangeReturn = (p: Point[]) => (p.length > 1 && p[0].c ? ((p[p.length - 1].c - p[0].c) / p[0].c) * 100 : null);

// ─── Live sources for every kind of holding ───
export type LiveKind = 'stock' | 'fund' | 'nps' | 'crypto';
export type LiveRef = { kind: LiveKind; id: string };
export type LivePrice = { price: number | null; change: number | null; changePct: number | null; time: string | null; name?: string; house?: string; category?: string; volume?: number | null; marketCap?: number | null; returns?: Record<string, number | null> };
export type CoinHit = { id: string; name: string; symbol: string; rank: number | null };
export const refKey = (r: LiveRef) => `${r.kind}:${r.id}`;

// watchlist ids: "RELIANCE.NS" (stock), "mf:122639", "nps:SM001003", "cg:bitcoin"
export function parseWatch(w: string): LiveRef {
  if (w.startsWith('mf:')) return { kind: 'fund', id: w.slice(3) };
  if (w.startsWith('nps:')) return { kind: 'nps', id: w.slice(4) };
  if (w.startsWith('cg:')) return { kind: 'crypto', id: w.slice(3) };
  return { kind: 'stock', id: w };
}
export const watchId = (r: LiveRef) => (r.kind === 'stock' ? r.id : `${{ fund: 'mf', nps: 'nps', crypto: 'cg' }[r.kind]}:${r.id}`);

export async function getNps(codes: string[]): Promise<Record<string, Nav & { returns?: Record<string, number | null> }>> {
  const list = [...new Set(codes)].filter(Boolean).sort();
  if (!list.length) return {};
  const { navs } = await cached(`nps:${list}`, 30 * 60_000, () => call<{ navs: (Nav & { returns?: Record<string, number | null> })[] }>({ op: 'nps', codes: list.join(',') }));
  return Object.fromEntries(navs.map((n) => [n.code, n]));
}
type Coin = { id: string; price: number | null; change: number | null; changePct: number | null; volume: number | null; marketCap: number | null; time: string | null; error?: string };
export async function getCoins(ids: string[]): Promise<Record<string, Coin>> {
  const list = [...new Set(ids)].filter(Boolean).sort();
  if (!list.length) return {};
  const { coins } = await cached(`cg:${list}`, 60_000, () => call<{ coins: Coin[] }>({ op: 'coin', ids: list.join(',') }));
  return Object.fromEntries(coins.map((c) => [c.id, c]));
}

// One call for any mix of holdings → prices keyed by refKey
export async function getLive(refs: LiveRef[]): Promise<Record<string, LivePrice>> {
  const ids = (k: LiveKind) => refs.filter((r) => r.kind === k).map((r) => r.id);
  const [q, f, n, c] = await Promise.all([
    getQuotes(ids('stock')).catch(() => ({} as Record<string, Quote>)),
    getNavs(ids('fund')).catch(() => ({} as Record<string, Nav>)),
    getNps(ids('nps')).catch(() => ({} as Awaited<ReturnType<typeof getNps>>)),
    getCoins(ids('crypto')).catch(() => ({} as Record<string, Coin>)),
  ]);
  const out: Record<string, LivePrice> = {};
  for (const [id, x] of Object.entries(q)) if (x?.price != null) out[`stock:${id}`] = { price: x.price, change: x.change, changePct: x.changePct, time: x.time, name: x.name, volume: x.volume };
  for (const [id, x] of Object.entries(f)) if (x?.nav != null) out[`fund:${id}`] = { price: x.nav, change: x.change, changePct: x.changePct, time: x.date, name: x.name, house: x.house, category: x.category };
  for (const [id, x] of Object.entries(n)) if (x?.nav != null) out[`nps:${id}`] = { price: x.nav, change: x.change, changePct: x.changePct, time: x.date, name: x.name, house: x.house, category: 'NPS', returns: x.returns };
  for (const [id, x] of Object.entries(c)) if (x?.price != null) out[`crypto:${id}`] = { price: x.price, change: x.change, changePct: x.changePct, time: x.time, volume: x.volume, marketCap: x.marketCap };
  if (refs.length && !Object.keys(out).length) throw new Error('no live prices');
  return out;
}

export const getNpsChart = (code: string, range: Range) =>
  cached(`npc:${code}:${range}`, 60 * 60_000, () => call<{ points: Point[] }>({ op: 'npschart', code, range }));
export const getCoinChart = (id: string, range: Range) =>
  cached(`cgc:${id}:${range}`, range === '1d' ? 120_000 : 30 * 60_000, () => call<{ points: Point[] }>({ op: 'coinchart', id, range }));
export const searchNps = (q: string) =>
  cached(`ns:${q.toLowerCase()}`, 3600_000, () => call<{ results: FundHit[] }>({ op: 'npssearch', q })).then((r) => r.results);
export const searchCoins = (q: string) =>
  cached(`cs:${q.toLowerCase()}`, 3600_000, () => call<{ results: CoinHit[] }>({ op: 'coinsearch', q })).then((r) => r.results);

// Closing price / NAV on a past day — fills "bought at" from the date you bought
export const priceOn = (r: LiveRef, date: string) =>
  cached(`po:${refKey(r)}:${date}`, 86_400_000, () => call<{ price: number | null; date?: string }>({ op: 'priceon', kind: r.kind, id: r.id, date }));

// AMFI category → tax class
export function fundClassOf(category?: string, name = ''): 'equity' | 'debt' | 'hybrid' | 'gold' | 'other' {
  const c = `${category ?? ''} ${name}`.toLowerCase();
  if (/gold|silver/.test(c)) return 'gold';
  if (/equity scheme|elss|index|nifty|sensex|etf/.test(c) && !/debt|gilt|bond|liquid/.test(c)) return 'equity';
  if (/aggressive hybrid|arbitrage|equity savings|balanced advantage|dynamic asset/.test(c)) return /aggressive|arbitrage|equity savings/.test(c) ? 'equity' : 'hybrid';
  if (/debt|liquid|gilt|money market|overnight|bond|duration|credit|banking and psu|floater/.test(c)) return 'debt';
  if (/hybrid|multi asset|conservative/.test(c)) return 'hybrid';
  return 'other';
}

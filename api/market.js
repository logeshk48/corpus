// Corpus market data proxy — runs as a Vercel serverless function at /api/market.
// Browsers can't call Yahoo / mfapi directly (CORS), so the app asks this function instead.
//   ?op=quote&symbols=RELIANCE.NS,^NSEI     live quotes (≤25)
//   ?op=chart&symbol=TCS.NS&range=1mo        price history (1d 5d 1mo 6mo 1y 5y)
//   ?op=search&q=reliance                    NSE/BSE stocks, ETFs, indices
//   ?op=mfsearch&q=parag parikh              mutual fund schemes (AMFI via mfapi.in)
//   ?op=nav&codes=122639,118989              latest NAVs (≤25)
//   ?op=navchart&code=122639&range=1y        NAV history
//   ?op=npssearch&q=sbi scheme e tier i      NPS schemes      ?op=nps&codes=SM001003   ?op=npschart&code=..&range=1y
//   ?op=coinsearch&q=btc                     crypto           ?op=coin&ids=bitcoin     ?op=coinchart&id=bitcoin&range=1y
//   ?op=priceon&kind=stock|fund|nps|crypto&id=..&date=2026-08-14   price on a past day (to fill your buy price)
// Stocks/ETFs: Yahoo Finance (free, unofficial). Funds: mfapi.in (AMFI). NPS: npsnav.in. Crypto: CoinGecko (INR).

const YH1 = 'https://query1.finance.yahoo.com';
const YH2 = 'https://query2.finance.yahoo.com';
const MF = 'https://api.mfapi.in';
const NPS = 'https://npsnav.in/api';
const CG = 'https://api.coingecko.com/api/v3';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
};
const INTERVAL = { '1d': '5m', '5d': '30m', '1mo': '1d', '6mo': '1d', '1y': '1d', '5y': '1wk', max: '1mo' };
const DAYS = { '5d': 5, '1mo': 31, '6mo': 183, '1y': 366, '5y': 1830, max: 99999 };

// Give up on a slow source after 8 s instead of leaving the app spinning
async function getJson(url, ms = 8000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const r = await fetch(url, { headers: HEADERS, signal: ctl.signal }).finally(() => clearTimeout(t));
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}

function quoteFrom(chart, symbol) {
  const res = chart && chart.chart && chart.chart.result && chart.chart.result[0];
  if (!res) return { symbol, error: 'not found' };
  const m = res.meta || {};
  const prev = m.chartPreviousClose ?? m.previousClose ?? null;
  const price = m.regularMarketPrice ?? null;
  return {
    symbol: m.symbol || symbol,
    name: m.longName || m.shortName || symbol,
    exchange: m.fullExchangeName || m.exchangeName || '',
    currency: m.currency || 'INR',
    price,
    prevClose: prev,
    change: price != null && prev != null ? price - prev : null,
    changePct: price != null && prev ? ((price - prev) / prev) * 100 : null,
    dayHigh: m.regularMarketDayHigh ?? null,
    dayLow: m.regularMarketDayLow ?? null,
    high52: m.fiftyTwoWeekHigh ?? null,
    low52: m.fiftyTwoWeekLow ?? null,
    volume: m.regularMarketVolume ?? null,
    time: m.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString() : null,
    type: m.instrumentType || '',
  };
}

const chartUrl = (symbol, range) =>
  `${YH1}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${INTERVAL[range] || '1d'}&includePrePost=false`;

// mfapi dates are DD-MM-YYYY
const mfDate = (s) => {
  const [d, m, y] = String(s).split('-');
  return new Date(`${y}-${m}-${d}T15:30:00+05:30`).toISOString();
};

const tokens = (s) => String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// All mutual fund schemes (~40k), cached in the function's memory for 12 h
let funds = null;
async function fundList() {
  if (funds && Date.now() - funds.at < 12 * 3600_000) return funds.list;
  const d = await getJson(`${MF}/mf`, 20000);
  const list = d.map((x) => ({ code: String(x.schemeCode), name: x.schemeName, words: tokens(x.schemeName) }));
  funds = { at: Date.now(), list };
  return list;
}

const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
// "28-10-2026", "2026-10-28", "28 Oct 2026" → ISO
function anyDate(s) {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s).trim());
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T15:30:00+05:30`).toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function handle(q) {
  const op = q.op;
  if (op === 'quote') {
    const symbols = String(q.symbols || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 25);
    const out = await Promise.allSettled(symbols.map((s) => getJson(chartUrl(s, '1d')).then((c) => quoteFrom(c, s))));
    return { cache: 30, body: { quotes: out.map((r, i) => (r.status === 'fulfilled' ? r.value : { symbol: symbols[i], error: String(r.reason) })) } };
  }
  if (op === 'chart') {
    const range = INTERVAL[q.range] ? q.range : '1mo';
    const c = await getJson(chartUrl(q.symbol, range));
    const res = c.chart.result[0];
    const closes = (res.indicators.quote[0] || {}).close || [];
    const points = (res.timestamp || []).map((t, i) => ({ t: new Date(t * 1000).toISOString(), c: closes[i] })).filter((p) => p.c != null);
    return { cache: range === '1d' ? 60 : 900, body: { quote: quoteFrom(c, q.symbol), points } };
  }
  if (op === 'search') {
    const s = await getJson(`${YH2}/v1/finance/search?q=${encodeURIComponent(q.q || '')}&quotesCount=15&newsCount=0&listsCount=0`);
    const results = (s.quotes || [])
      .filter((x) => ['NSI', 'BSE'].includes(x.exchange) || (x.quoteType === 'INDEX' && /\^(NSE|BSE)/.test(x.symbol)))
      .map((x) => ({ symbol: x.symbol, name: x.longname || x.shortname || x.symbol, exchange: x.exchange === 'NSI' ? 'NSE' : x.exchange === 'BSE' ? 'BSE' : x.exchDisp, type: x.quoteType }));
    return { cache: 86400, body: { results } };
  }
  if (op === 'mfsearch') {
    // mfapi's own search is slow (10 s+). Keep the full scheme list in memory and search it here.
    const words = tokens(q.q);
    const all = await fundList().catch(() => null);
    if (all) {
      const results = all.filter((x) => words.every((w) => x.words.some((n) => n.startsWith(w)))).slice(0, 40).map((x) => ({ code: x.code, name: x.name }));
      return { cache: 86400, body: { results } };
    }
    const s = await getJson(`${MF}/mf/search?q=${encodeURIComponent(q.q || '')}`, 15000);
    return { cache: 86400, body: { results: (Array.isArray(s) ? s : []).slice(0, 25).map((x) => ({ code: String(x.schemeCode), name: x.schemeName })) } };
  }
  if (op === 'nav') {
    const codes = String(q.codes || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 25);
    const out = await Promise.allSettled(
      codes.map((c) =>
        getJson(`${MF}/mf/${c}`).then((d) => {
          const [now, prev] = d.data || [];
          const nav = now ? Number(now.nav) : null;
          const pnav = prev ? Number(prev.nav) : null;
          return {
            code: c,
            name: d.meta && d.meta.scheme_name,
            house: d.meta && d.meta.fund_house,
            category: d.meta && d.meta.scheme_category,
            nav,
            date: now ? mfDate(now.date) : null,
            change: nav != null && pnav != null ? nav - pnav : null,
            changePct: nav != null && pnav ? ((nav - pnav) / pnav) * 100 : null,
          };
        })
      )
    );
    return { cache: 3600, body: { navs: out.map((r, i) => (r.status === 'fulfilled' ? r.value : { code: codes[i], error: String(r.reason) })) } };
  }
  if (op === 'navchart') {
    const d = await getJson(`${MF}/mf/${q.code}`);
    const days = DAYS[q.range] || 366;
    const cutoff = Date.now() - days * 86400000;
    const points = (d.data || []).map((p) => ({ t: mfDate(p.date), c: Number(p.nav) })).filter((p) => new Date(p.t).getTime() >= cutoff).reverse();
    return { cache: 3600, body: { name: d.meta && d.meta.scheme_name, points } };
  }
  if (op === 'npssearch') {
    const all = await getJson(`${NPS}/schemes`);
    const words = tokens(q.q);
    const results = (all.data || [])
      .filter(([, name]) => words.every((w) => tokens(name).some((n) => n.startsWith(w))))
      .slice(0, 30)
      .map(([code, name]) => ({ code, name }));
    return { cache: 86400, body: { results } };
  }
  if (op === 'nps') {
    const codes = String(q.codes || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 25);
    const out = await Promise.allSettled(
      codes.map((c) =>
        getJson(`${NPS}/detailed/${encodeURIComponent(c)}`).then((d) => {
          const nav = Number(d.NAV);
          const pct = d['1D'] != null && d['1D'] !== '' ? Number(d['1D']) : null;
          return {
            code: c,
            name: d['Scheme Name'],
            house: d['PFM Name'],
            category: 'NPS',
            nav,
            date: d['Last Updated'] ? anyDate(d['Last Updated']) : null,
            change: pct != null ? nav - nav / (1 + pct / 100) : null,
            changePct: pct,
            returns: { '1M': num(d['1M']), '6M': num(d['6M']), '1Y': num(d['1Y']), '3Y': num(d['3Y']), '5Y': num(d['5Y']) },
          };
        })
      )
    );
    return { cache: 3600, body: { navs: out.map((r, i) => (r.status === 'fulfilled' ? r.value : { code: codes[i], error: String(r.reason) })) } };
  }
  if (op === 'npschart') {
    const d = await getJson(`${NPS}/historical/${encodeURIComponent(q.code)}`);
    const cutoff = Date.now() - (DAYS[q.range] || 366) * 86400000;
    const points = (d.data || []).map((p) => ({ t: anyDate(p.date), c: Number(p.nav) })).filter((p) => new Date(p.t).getTime() >= cutoff).sort((a, b) => (a.t < b.t ? -1 : 1));
    return { cache: 3600, body: { points } };
  }
  if (op === 'coinsearch') {
    const s = await getJson(`${CG}/search?query=${encodeURIComponent(q.q || '')}`);
    return { cache: 86400, body: { results: (s.coins || []).slice(0, 15).map((c) => ({ id: c.id, name: c.name, symbol: String(c.symbol || '').toUpperCase(), rank: c.market_cap_rank })) } };
  }
  if (op === 'coin') {
    const ids = String(q.ids || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 25);
    const d = await getJson(`${CG}/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=inr&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`);
    const coins = ids.map((id) => {
      const x = d[id];
      if (!x) return { id, error: 'not found' };
      const price = x.inr, pct = x.inr_24h_change ?? null;
      return { id, price, changePct: pct, change: pct != null ? price - price / (1 + pct / 100) : null, volume: x.inr_24h_vol ?? null, marketCap: x.inr_market_cap ?? null, time: x.last_updated_at ? new Date(x.last_updated_at * 1000).toISOString() : null };
    });
    return { cache: 60, body: { coins } };
  }
  if (op === 'coinchart') {
    const days = Math.min(DAYS[q.range] || 1, 365);
    const d = await getJson(`${CG}/coins/${encodeURIComponent(q.id)}/market_chart?vs_currency=inr&days=${q.range === '1d' ? 1 : days}`);
    return { cache: q.range === '1d' ? 120 : 1800, body: { points: (d.prices || []).map(([t, c]) => ({ t: new Date(t).toISOString(), c })) } };
  }
  if (op === 'priceon') {
    const day = new Date(`${q.date}T00:00:00+05:30`);
    if (isNaN(day.getTime())) return { status: 400, body: { error: 'bad date' } };
    const t = day.getTime();
    let found = null;
    if (q.kind === 'stock') {
      const p1 = Math.floor(t / 1000), p2 = p1 + 10 * 86400; // first trading day on/after the date
      const c = await getJson(`${YH1}/v8/finance/chart/${encodeURIComponent(q.id)}?period1=${p1}&period2=${p2}&interval=1d`);
      const r = c.chart.result[0];
      const closes = (r.indicators.quote[0] || {}).close || [];
      const i = (r.timestamp || []).findIndex((_, k) => closes[k] != null);
      if (i >= 0) found = { price: closes[i], date: new Date(r.timestamp[i] * 1000).toISOString() };
    } else if (q.kind === 'fund' || q.kind === 'nps') {
      const d = await getJson(q.kind === 'fund' ? `${MF}/mf/${q.id}` : `${NPS}/historical/${encodeURIComponent(q.id)}`);
      // NAV on that day, or the last one before it (holidays)
      const pts = (d.data || []).map((p) => ({ t: new Date(q.kind === 'fund' ? mfDate(p.date) : anyDate(p.date)).getTime(), c: Number(p.nav) })).sort((a, b) => a.t - b.t);
      const before = pts.filter((p) => p.t <= t + 86400000);
      const p = before.length ? before[before.length - 1] : pts[0];
      if (p) found = { price: p.c, date: new Date(p.t).toISOString() };
    } else if (q.kind === 'crypto') {
      const [y, m, d] = String(q.date).split('-');
      const h = await getJson(`${CG}/coins/${encodeURIComponent(q.id)}/history?date=${d}-${m}-${y}&localization=false`);
      const price = h.market_data && h.market_data.current_price && h.market_data.current_price.inr;
      if (price) found = { price, date: day.toISOString() };
    }
    return { cache: 86400, body: found || { price: null } };
  }
  return { status: 400, body: { error: 'unknown op' } };
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const { status = 200, cache = 60, body } = await handle(req.query || {});
    res.setHeader('Cache-Control', `s-maxage=${cache}, stale-while-revalidate=${cache * 2}`);
    return res.status(status).json(body);
  } catch (e) {
    return res.status(502).json({ error: 'Market data unavailable right now', detail: String(e && e.message) });
  }
}
module.exports = handler;

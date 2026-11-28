// Logos for holdings: each fund house, big company, ETF, coin, bank or scheme is matched to its website,
// and the icon is fetched through our own /api/logo (so no outside service sees what you hold).
// Anything not in these lists keeps its initials sticker.
import type { InvestType } from '@/types/investment';
import { Platform } from 'react-native';

const PROD = 'https://corpus-fawn-eight.vercel.app';
const onVercel = Platform.OS === 'web' && typeof window !== 'undefined' && /vercel\.app$/.test(window.location.hostname);
const BASE = onVercel ? '' : process.env.EXPO_PUBLIC_MARKET_API || PROD;

// Fund houses and pension managers, by a word in the scheme name. Longer names first.
const HOUSES: [RegExp, string][] = [
  [/parag parikh|ppfas/, 'amc.ppfas.com'],
  [/icici pru/, 'icicipruamc.com'],
  [/aditya birla/, 'adityabirlacapital.com'],
  [/mirae/, 'miraeassetmf.co.in'],
  [/motilal/, 'motilaloswalmf.com'],
  [/nippon|reliance mutual/, 'mf.nipponindiaim.com'],
  [/franklin/, 'franklintempletonindia.com'],
  [/canara robeco/, 'canararobeco.com'],
  [/mahindra manulife/, 'mahindramanulife.com'],
  [/baroda bnp/, 'barodabnpparibasmf.in'],
  [/bank of india/, 'boimf.in'],
  [/bajaj finserv/, 'bajajamc.com'],
  [/jm financial/, 'jmfinancialmf.com'],
  [/360 one|iifl/, '360.one'],
  [/white ?oak/, 'mf.whiteoakindia.com'],
  [/old bridge/, 'oldbridgecapital.com'],
  [/hdfc/, 'hdfcfund.com'],
  [/kotak/, 'kotakmf.com'],
  [/\bsbi\b/, 'sbimf.com'],
  [/\baxis\b/, 'axismf.com'],
  [/\buti\b/, 'utimf.com'],
  [/\bdsp\b/, 'dspim.com'],
  [/\btata\b/, 'tatamutualfund.com'],
  [/\bquant\b/, 'quantmutual.com'],
  [/quantum/, 'quantumamc.com'],
  [/edelweiss/, 'edelweissmf.com'],
  [/invesco/, 'invescomutualfund.com'],
  [/\bhsbc\b|l&t mutual/, 'assetmanagement.hsbc.co.in'],
  [/bandhan|idfc/, 'bandhanmutual.com'],
  [/\bpgim\b/, 'pgimindiamf.com'],
  [/sundaram/, 'sundarammutual.com'],
  [/\blic\b/, 'licmf.com'],
  [/\bunion\b/, 'unionmf.com'],
  [/\bnavi\b/, 'navi.com'],
  [/groww/, 'groww.in'],
  [/zerodha/, 'zerodhafundhouse.com'],
  [/\bsamco\b/, 'samcomf.com'],
  [/helios/, 'heliosmf.in'],
  [/shriram/, 'shriramamc.in'],
  [/\btrust\b/, 'trustmf.com'],
  [/\bnj\b/, 'njmutualfund.com'],
  [/\biti\b/, 'itiamc.com'],
  [/taurus/, 'taurusmutualfund.com'],
];

// Banks and others, for FDs (by a word in the name you gave it)
const BANKS: [RegExp, string][] = [
  [/\bsbi\b|state bank/, 'sbi.co.in'],
  [/hdfc/, 'hdfcbank.com'],
  [/icici/, 'icicibank.com'],
  [/\baxis\b/, 'axisbank.com'],
  [/kotak/, 'kotak.com'],
  [/idfc/, 'idfcfirstbank.com'],
  [/indusind/, 'indusind.com'],
  [/\byes\b/, 'yesbank.in'],
  [/\bau\b/, 'aubank.in'],
  [/bajaj/, 'bajajfinserv.in'],
  [/canara/, 'canarabank.com'],
  [/\bpnb\b|punjab national/, 'pnbindia.in'],
  [/baroda|\bbob\b/, 'bankofbaroda.in'],
  [/union bank/, 'unionbankofindia.co.in'],
  [/federal/, 'federalbank.co.in'],
  [/post office|india post/, 'indiapost.gov.in'],
  [/shriram/, 'shriramfinance.in'],
  [/ujjivan/, 'ujjivansfb.in'],
  [/equitas/, 'equitasbank.com'],
];

// The bigger NSE companies, by symbol
const STOCKS: Record<string, string> = {
  RELIANCE: 'ril.com', TCS: 'tcs.com', HDFCBANK: 'hdfcbank.com', ICICIBANK: 'icicibank.com', INFY: 'infosys.com',
  BHARTIARTL: 'airtel.in', SBIN: 'sbi.co.in', ITC: 'itcportal.com', HINDUNILVR: 'hul.co.in', LT: 'larsentoubro.com',
  KOTAKBANK: 'kotak.com', AXISBANK: 'axisbank.com', BAJFINANCE: 'bajajfinserv.in', BAJAJFINSV: 'bajajfinserv.in',
  HCLTECH: 'hcltech.com', MARUTI: 'marutisuzuki.com', SUNPHARMA: 'sunpharma.com', ASIANPAINT: 'asianpaints.com',
  TITAN: 'titancompany.in', ULTRACEMCO: 'ultratechcement.com', WIPRO: 'wipro.com', NTPC: 'ntpc.co.in',
  ONGC: 'ongcindia.com', POWERGRID: 'powergrid.in', TATAMOTORS: 'tatamotors.com', TMPV: 'tatamotors.com',
  TATASTEEL: 'tatasteel.com', 'M&M': 'mahindra.com', NESTLEIND: 'nestle.in', ADANIENT: 'adanienterprises.com',
  ADANIPORTS: 'adaniports.com', ADANIGREEN: 'adanigreenenergy.com', ADANIPOWER: 'adanipower.com', JSWSTEEL: 'jsw.in',
  COALINDIA: 'coalindia.in', TECHM: 'techmahindra.com', HINDALCO: 'hindalco.com', GRASIM: 'grasim.com',
  CIPLA: 'cipla.com', DRREDDY: 'drreddys.com', DIVISLAB: 'divislabs.com', APOLLOHOSP: 'apollohospitals.com',
  EICHERMOT: 'eicher.in', HEROMOTOCO: 'heromotocorp.com', 'BAJAJ-AUTO': 'bajajauto.com', BRITANNIA: 'britannia.co.in',
  TATACONSUM: 'tataconsumer.com', INDUSINDBK: 'indusind.com', SBILIFE: 'sbilife.co.in', HDFCLIFE: 'hdfclife.com',
  ICICIPRULI: 'iciciprulife.com', ICICIGI: 'icicilombard.com', BPCL: 'bharatpetroleum.in', IOC: 'iocl.com',
  HINDPETRO: 'hindustanpetroleum.com', GAIL: 'gailonline.com', SHREECEM: 'shreecement.com', AMBUJACEM: 'ambujacement.com',
  ACC: 'acclimited.com', DABUR: 'dabur.com', GODREJCP: 'godrejcp.com', MARICO: 'marico.com', COLPAL: 'colgatepalmolive.co.in',
  PIDILITIND: 'pidilite.com', BERGEPAINT: 'bergerpaints.com', HAVELLS: 'havells.com', SIEMENS: 'siemens.co.in',
  ABB: 'abb.com', BEL: 'bel-india.in', HAL: 'hal-india.co.in', BHEL: 'bhel.com', IRCTC: 'irctc.co.in', IRFC: 'irfc.co.in',
  ETERNAL: 'eternal.com', ZOMATO: 'zomato.com', SWIGGY: 'swiggy.com', NYKAA: 'nykaa.com', PAYTM: 'paytm.com',
  POLICYBZR: 'policybazaar.com', DMART: 'dmartindia.com', TRENT: 'trentlimited.com', VEDL: 'vedantalimited.com',
  DLF: 'dlf.in', LODHA: 'lodhagroup.com', GODREJPROP: 'godrejproperties.com', TVSMOTOR: 'tvsmotor.com',
  VBL: 'varunbeverages.com', TATAPOWER: 'tatapower.com', TATAELXSI: 'tataelxsi.com', LTIM: 'ltimindtree.com',
  PERSISTENT: 'persistent.com', MPHASIS: 'mphasis.com', COFORGE: 'coforge.com', NAUKRI: 'infoedge.in',
  INDIGO: 'goindigo.in', INDHOTEL: 'ihcltata.com', BANKBARODA: 'bankofbaroda.in', PNB: 'pnbindia.in',
  CANBK: 'canarabank.com', UNIONBANK: 'unionbankofindia.co.in', IDFCFIRSTB: 'idfcfirstbank.com', YESBANK: 'yesbank.in',
  BANDHANBNK: 'bandhanbank.com', FEDERALBNK: 'federalbank.co.in', AUBANK: 'aubank.in', CHOLAFIN: 'cholamandalam.com',
  SHRIRAMFIN: 'shriramfinance.in', MUTHOOTFIN: 'muthootfinance.com', LICI: 'licindia.in', JIOFIN: 'jfs.in',
  HDFCAMC: 'hdfcfund.com', MOTHERSON: 'motherson.com', BOSCHLTD: 'bosch.in', MRF: 'mrftyres.com',
  APOLLOTYRE: 'apollotyres.com', ASHOKLEY: 'ashokleyland.com', CUMMINSIND: 'cumminsindia.com', POLYCAB: 'polycab.com',
  DIXON: 'dixoninfo.com', ZYDUSLIFE: 'zyduslife.com', LUPIN: 'lupin.com', AUROPHARMA: 'aurobindo.com',
  TORNTPHARM: 'torrentpharma.com', MANKIND: 'mankindpharma.com', MAXHEALTH: 'maxhealthcare.in', PAGEIND: 'pageind.com',
  UPL: 'upl-ltd.com', SRF: 'srf.com', PIIND: 'piindustries.com', NHPC: 'nhpcindia.com', PFC: 'pfcindia.com',
  RECLTD: 'recindia.nic.in', SUZLON: 'suzlon.com', IREDA: 'ireda.in', MAZDOCK: 'mazagondock.in', SBICARD: 'sbicard.com',
  HINDZINC: 'hzlindia.com', JINDALSTEL: 'jindalsteelpower.com', SAIL: 'sail.co.in', NMDC: 'nmdc.co.in',
  TATACOMM: 'tatacommunications.com', IDEA: 'myvi.in', OLAELEC: 'olaelectric.com', HYUNDAI: 'hyundai.com',
  BAJAJHFL: 'bajajhousing.co.in', BAJAJHLDNG: 'bajajholdings.in', TATATECH: 'tatatechnologies.com', KPITTECH: 'kpit.com',
};

// ETFs by who runs them (NIFTYBEES, GOLDBEES, SILVERBEES are Nippon India)
const ETFS: [RegExp, string][] = [
  [/BEES$/, 'mf.nipponindiaim.com'],
  [/^SETF/, 'sbimf.com'],
  [/^ICICI/, 'icicipruamc.com'],
  [/^HDFC/, 'hdfcfund.com'],
  [/^KOTAK/, 'kotakmf.com'],
  [/^(MON|MOM|MOVALUE|MOGSEC)/, 'motilaloswalmf.com'],
  [/^AXIS/, 'axismf.com'],
  [/^UTI/, 'utimf.com'],
  [/^DSP/, 'dspim.com'],
  [/^MIRAE|^MAFANG|^MAHKTECH|^MASPTOP/, 'miraeassetmf.co.in'],
  [/^TATA|^TATSILV/, 'tatamutualfund.com'],
  [/^ABSL|^BSLNIFTY/, 'adityabirlacapital.com'],
  [/^EDEL|^EBBETF/, 'edelweissmf.com'],
  [/^GROWW/, 'groww.in'],
  [/^ZERODHA|^LIQUIDCASE/, 'zerodhafundhouse.com'],
];

// Coins by CoinGecko id
const COINS: Record<string, string> = {
  bitcoin: 'bitcoin.org', ethereum: 'ethereum.org', solana: 'solana.com', binancecoin: 'bnbchain.org', ripple: 'xrpl.org',
  cardano: 'cardano.org', dogecoin: 'dogecoin.com', 'matic-network': 'polygon.technology', 'polygon-ecosystem-token': 'polygon.technology',
  tether: 'tether.to', 'usd-coin': 'circle.com', polkadot: 'polkadot.network', chainlink: 'chain.link', 'avalanche-2': 'avax.network',
  litecoin: 'litecoin.org', tron: 'tron.network', 'shiba-inu': 'shibatoken.com', 'the-open-network': 'ton.org', stellar: 'stellar.org',
  near: 'near.org', aptos: 'aptosfoundation.org', sui: 'sui.io', uniswap: 'uniswap.org', 'bitcoin-cash': 'bitcoincash.org',
};

const pick = (list: [RegExp, string][], text: string) => list.find(([re]) => re.test(text))?.[1] ?? null;

export type LogoInput = { type: InvestType | 'fund'; name: string; symbol?: string; coinId?: string };

// The website whose icon stands for this holding, or null for the initials sticker
export function logoDomain(x: LogoInput): string | null {
  const name = x.name.toLowerCase();
  const sym = (x.symbol ?? '').replace(/\.(NS|BO)$/, '').toUpperCase();
  if (x.type === 'crypto') return x.coinId ? COINS[x.coinId] ?? null : null;
  if (x.type === 'epf') return 'epfindia.gov.in';
  if (x.type === 'fd') return pick(BANKS, name);
  if (sym) return STOCKS[sym] ?? pick(ETFS, sym) ?? (x.type === 'goldbond' ? 'rbi.org.in' : null);
  if (x.type === 'goldbond') return 'rbi.org.in';
  if (x.type === 'mf' || x.type === 'fund' || x.type === 'nps') return pick(HOUSES, name);
  return null;
}

// While developing on this computer the server function isn't deployed yet, so the icon comes from Google directly
export function logoUrl(domain: string) {
  return __DEV__ && !onVercel ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : `${BASE}/api/logo?d=${domain}`;
}

export const logoFor = (x: LogoInput) => {
  const d = logoDomain(x);
  return d ? logoUrl(d) : null;
};

export type InvestType = 'mf' | 'stock' | 'fd' | 'epf' | 'ppf' | 'nps' | 'goldbond' | 'crypto' | 'other';

export type Investment = {
  id: string;
  name: string;            // "Parag Parikh Flexi Cap", "HDFC FD", "My EPF"
  type: InvestType;
  invested: number;        // total money you put in (cost)
  value: number;           // value on `valueAt` (market types: what the app shows; EPF/PPF: balance)
  valueAt: string;         // ISO — when `value` was true
  startDate: string;       // ISO — when you started (first purchase / FD opened)
  rate?: number;           // % a year: FD rate, EPF 8.25, PPF 7.1 — used to grow the value automatically
  maturityDate?: string;   // FD
  units?: number;          // MF / stock / crypto (optional, for later live prices)
  schemeCode?: string;     // MF scheme code (live NAV, Day 4)
};
export type NewInvestment = Omit<Investment, 'id'>;

export const INVEST_TYPES: { id: InvestType; label: string; icon: string; liquid: boolean; grows?: number; hint: string; cls: 'equity' | 'debt' | 'retirement' | 'gold' | 'crypto' | 'other' }[] = [
  { id: 'mf', label: 'Mutual fund', icon: 'pie-chart-outline', liquid: true, hint: 'SIPs and lump sums', cls: 'equity' },
  { id: 'stock', label: 'Stocks', icon: 'trending-up-outline', liquid: true, hint: 'Shares on NSE/BSE', cls: 'equity' },
  { id: 'fd', label: 'Fixed deposit', icon: 'lock-closed-outline', liquid: true, grows: 7, hint: 'Grows with interest automatically', cls: 'debt' },
  { id: 'epf', label: 'EPF / PF', icon: 'briefcase-outline', liquid: false, grows: 8.25, hint: 'From your payslip or EPFO passbook', cls: 'retirement' },
  { id: 'ppf', label: 'PPF', icon: 'shield-checkmark-outline', liquid: false, grows: 7.1, hint: '15-year account at a bank or post office', cls: 'retirement' },
  { id: 'nps', label: 'NPS', icon: 'umbrella-outline', liquid: false, hint: 'Pension account value', cls: 'retirement' },
  { id: 'goldbond', label: 'Gold bond / digital gold', icon: 'diamond-outline', liquid: true, hint: 'SGB, gold ETF, app gold', cls: 'gold' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', liquid: true, hint: 'Volatile, value changes daily', cls: 'crypto' },
  { id: 'other', label: 'Other', icon: 'cube-outline', liquid: false, hint: 'Chit fund, LIC surrender value, P2P…', cls: 'other' },
];
export const investMeta = (t: InvestType) => INVEST_TYPES.find((x) => x.id === t) ?? INVEST_TYPES[8];

// What can be exported: every entry, the capital-gains list for your CA, and your holdings.
import { findCategory } from '@/constants/categories';
import type { Account } from '@/types/account';
import type { Bill } from '@/types/bill';
import type { Investment } from '@/types/investment';
import { investMeta } from '@/types/investment';
import type { Realized } from '@/types/realized';
import type { Transaction } from '@/types/transaction';
import { toCsv } from './csv';
import { currentValue } from './investments';
import { holdingXirr } from './returns';

const d = (iso: string) => {
  const x = new Date(iso);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export function transactionsCsv(tx: Transaction[], accounts: Account[], bills: Bill[]) {
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const bill = new Map(bills.map((b) => [b.id, b.name]));
  const rows = [...tx]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => [
      d(t.date),
      t.type === 'income' ? 'Income' : 'Expense',
      findCategory(t.type, t.category)?.label ?? t.category,
      t.type === 'income' ? t.amount : -t.amount,
      t.note ?? '',
      t.accountId ? acc.get(t.accountId) ?? '' : '',
      t.recurringId ? bill.get(t.recurringId) ?? 'Bill' : '',
    ]);
  return toCsv(['Date', 'Type', 'Category', 'Amount (₹)', 'Note', 'Account', 'Bill'], rows);
}

// For your CA / ITR capital gains section: one row per sale (FIFO cost)
const CLS: Record<string, string> = {
  equity: 'Listed equity / equity fund', 'gold-listed': 'Gold ETF / SGB', 'gold-fund': 'Gold fund', 'other-fund': 'Other fund', debt: 'Debt fund', crypto: 'Crypto (VDA)',
};
export function capitalGainsCsv(sales: Realized[]) {
  const rows = [...sales]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => [d(s.date), s.name, CLS[s.cls] ?? s.cls, s.units, s.sellPrice, Math.round(s.units * s.sellPrice), s.cost, s.shortGain, s.longGain, s.shortGain + s.longGain]);
  return toCsv(['Sale date', 'Name', 'Kind', 'Units', 'Sell price (₹)', 'Sale value (₹)', 'Cost, FIFO (₹)', 'Short-term gain (₹)', 'Long-term gain (₹)', 'Total gain (₹)'], rows);
}

export function holdingsCsv(list: Investment[]) {
  const rows = list.map((h) => {
    const v = currentValue(h).value;
    const x = holdingXirr(h, v);
    return [h.name, investMeta(h.type).label, h.units ?? '', h.symbol ?? h.schemeCode ?? h.npsCode ?? h.coinId ?? '', Math.round(h.invested), Math.round(v), Math.round(v - h.invested), x == null ? '' : x.toFixed(1), h.sip?.active ? h.sip.amount : '', d(h.startDate)];
  });
  return toCsv(['Name', 'Type', 'Units', 'Ticker / code', 'Invested (₹)', 'Value today (₹)', 'Gain (₹)', 'XIRR %', 'Monthly SIP (₹)', 'Since'], rows);
}

// "Can you trust these numbers?" — reports are only as good as what's logged.
// Each check says what's off, why it matters, and where to fix it.
import type { Investment } from '@/types/investment';
import type { Transaction } from '@/types/transaction';
import { verifiedAgo, type AccountBalance } from './accounts';
import { bigOneOffs, duplicates } from './detect';
import { formatINR } from './format';
import { needsCheckup } from './investments';

export type HealthCheck = { id: string; ok: boolean; title: string; detail: string; href: string; weight: number };

const DAY = 86_400_000;
export function dataHealth(p: { tx: Transaction[]; accounts: AccountBalance[]; investments: Investment[]; dismissed: string[]; now?: Date }) {
  const now = p.now ?? new Date();
  const checks: HealthCheck[] = [];
  // 1) logging coverage, last 30 days (the biggest factor)
  const from = now.getTime() - 30 * DAY;
  const recent = p.tx.filter((t) => new Date(t.date).getTime() >= from && !t.recurringId);
  const days = new Set(recent.map((t) => new Date(t.date).toDateString())).size;
  const coverage = days / 30;
  checks.push({
    id: 'coverage', ok: coverage >= 0.6, weight: 35, href: '/add',
    title: `Logged on ${days} of the last 30 days`,
    detail: coverage >= 0.6 ? 'Good coverage — spending totals are close to real.' : 'Days without entries make spending look lower than it is. Even a rough amount for a missed day helps.',
  });
  // 2) income this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const incomeBefore = p.tx.some((t) => t.type === 'income' && new Date(t.date) < monthStart);
  const incomeNow = p.tx.some((t) => t.type === 'income' && new Date(t.date) >= monthStart);
  if (incomeBefore || incomeNow)
    checks.push({
      id: 'income', ok: incomeNow || now.getDate() <= 7, weight: 15, href: '/add',
      title: incomeNow ? 'Income logged this month' : 'No income logged this month',
      detail: incomeNow ? 'Savings rate and safe-to-spend have what they need.' : 'Savings rate and safe-to-spend can’t be right without it.',
    });
  // 3) balances fresh
  const live = p.accounts.filter((a) => !a.archived);
  if (live.length) {
    const stale = live.filter((a) => verifiedAgo(a, now).stale);
    checks.push({
      id: 'balances', ok: stale.length === 0, weight: 15, href: '/accounts',
      title: stale.length ? `${stale.length} balance${stale.length > 1 ? 's' : ''} not updated for a week` : 'Balances up to date',
      detail: stale.length ? `${stale.map((a) => a.name).slice(0, 3).join(', ')} — net worth, emergency fund and low-balance alerts use these.` : 'Net worth and alerts are using fresh numbers.',
    });
  }
  // 4) double entries / typos waiting
  const dups = duplicates(p.tx, now).filter((d) => !p.dismissed.includes(d.key));
  const typos = bigOneOffs(p.tx, now).filter((b) => b.typo && !p.dismissed.includes(b.key));
  checks.push({
    id: 'dups', ok: dups.length + typos.length === 0, weight: 15, href: '/',
    title: dups.length + typos.length ? `${dups.length + typos.length} possible mistake${dups.length + typos.length > 1 ? 's' : ''} to check` : 'No double entries or typos found',
    detail: dups.length + typos.length ? `${dups.length ? `${dups.length} logged twice` : ''}${dups.length && typos.length ? ', ' : ''}${typos.length ? `${typos.length} with a possible extra zero` : ''} — see “Found for you” on Home.` : 'Totals aren’t inflated by repeats.',
  });
  // 5) "Other" category share
  const spent = recent.filter((t) => t.type === 'expense');
  const total = spent.reduce((a, t) => a + t.amount, 0);
  const other = spent.filter((t) => t.category === 'other').reduce((a, t) => a + t.amount, 0);
  if (total > 0)
    checks.push({
      id: 'other', ok: other / total <= 0.2, weight: 10, href: '/transactions',
      title: other / total > 0.2 ? `${Math.round((other / total) * 100)}% of spending is “Other”` : 'Spending is well categorised',
      detail: other / total > 0.2 ? `${formatINR(Math.round(other))} in the last 30 days. Putting it in real categories makes budgets and reports useful.` : 'Category reports mean something.',
    });
  // 6) investment values
  const old = p.investments.filter((h) => needsCheckup(h, now));
  if (p.investments.length)
    checks.push({
      id: 'invest', ok: old.length === 0, weight: 10, href: '/invest',
      title: old.length ? `${old.length} investment value${old.length > 1 ? 's' : ''} out of date` : 'Investment values current',
      detail: old.length ? `${old.map((h) => h.name).slice(0, 2).join(', ')} — no live price and not updated for 30+ days.` : 'Live prices or recent updates.',
    });
  const max = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : c.id === 'coverage' ? c.weight * Math.min(1, coverage / 0.6) : 0), 0);
  const score = max ? Math.round((got / max) * 100) : 0;
  return { score, label: score >= 80 ? 'Reliable' : score >= 55 ? 'Mostly right' : 'Incomplete', checks: checks.sort((a, b) => Number(a.ok) - Number(b.ok) || b.weight - a.weight), coverage };
}

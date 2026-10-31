import { useAccounts } from '@/hooks/useAccounts';
import { useAssets } from '@/hooks/useAssets';
import { useBills } from '@/hooks/useBills';
import { useGoldRate } from '@/hooks/useGoldRate';
import { useInvestments } from '@/hooks/useInvestments';
import { useIous } from '@/hooks/useIous';
import { useTransactions } from '@/hooks/useTransactions';
import { accountBalances, accountTotals } from '@/utils/accounts';
import { netWorthItems, netWorthTotals } from '@/utils/netWorth';
import { scoreInputs } from '@/utils/wealthInputs';
import { wealthScore } from '@/utils/wealthScore';
import { useMemo } from 'react';

// Everything the wealth screens need, in one place
export function useWealth() {
  const { accounts, loading: aL } = useAccounts();
  const { transactions: tx, loading: tL } = useTransactions('last12Months');
  const { ious } = useIous();
  const { bills } = useBills();
  const { assets, snapshots, loading: asL } = useAssets();
  const gold = useGoldRate();
  const { investments, loading: iL } = useInvestments();
  return useMemo(() => {
    const accList = accountBalances(accounts, tx);
    const input = { accounts: accList, ious, bills, assets, investments, goldRate: gold.rate ? { rate: gold.rate, mode: gold.mode } : null };
    const items = netWorthItems(input);
    const totals = netWorthTotals(items);
    const inputs = scoreInputs({ tx, investments, ious, bills, items, totals, cardDues: accountTotals(accList).cardDues, hasAccounts: accounts.length > 0 });
    return { score: wealthScore(inputs), inputs, items, totals, nwInput: input, snapshots, tx, investments, ious, bills, accounts: accList, loading: aL || tL || asL || iL };
  }, [accounts, tx, ious, bills, assets, investments, gold.rate, gold.mode, snapshots, aL, tL, asL, iL]);
}

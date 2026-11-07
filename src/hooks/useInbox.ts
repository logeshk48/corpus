import { useAccounts } from '@/hooks/useAccounts';
import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useIous } from '@/hooks/useIous';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { accountBalances } from '@/utils/accounts';
import { buildInbox, needsAttention } from '@/utils/inbox';
import { useMemo } from 'react';

// Every reminder in the app, for the bell and the notifications centre
export function useInbox() {
  const { ious } = useIous();
  const { accounts } = useAccounts();
  const { bills } = useBills();
  const { investments } = useInvestments();
  const { settings } = useSettings();
  const { transactions } = useTransactions('month');
  return useMemo(() => {
    const items = buildInbox({ ious, accounts: accountBalances(accounts, transactions), bills, investments, settings, monthTx: transactions });
    return { items, attention: needsAttention(items) };
  }, [ious, accounts, bills, investments, settings, transactions]);
}

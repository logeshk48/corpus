import { useAccounts } from '@/hooks/useAccounts';
import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useIous } from '@/hooks/useIous';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { accountBalances } from '@/utils/accounts';
import { applyMarks, buildInbox, needsAttention } from '@/utils/inbox';
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
    const all = buildInbox({ ious, accounts: accountBalances(accounts, transactions), bills, investments, settings, monthTx: transactions });
    const { shown, snoozed } = applyMarks(all, settings.inbox);
    return { items: shown, snoozed, bills, attention: needsAttention(shown) };
  }, [ious, accounts, bills, investments, settings, transactions]);
}

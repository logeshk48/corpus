import { useBills } from '@/hooks/useBills';
import { useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { unpaidThisMonth } from '@/utils/bills';
import { computeSafeToSpend, cycleBounds } from '@/utils/safeToSpend';
import { sipInvested, sipsDueBefore } from '@/utils/sip';
import { useMemo } from 'react';

// Today's safe-to-spend, same inputs as the Home hero (for the briefing)
export function useSafeToday() {
  const { transactions } = useTransactions('month');
  const { vaults } = useVaults();
  const { settings } = useSettings();
  const { bills } = useBills();
  const { investments } = useInvestments();
  return useMemo(() => {
    const cyc = cycleBounds(new Date(), settings.cycleStartDay);
    const r = computeSafeToSpend({
      monthTransactions: transactions, jars: vaults, monthlyBudget: settings.monthlyBudget, billsDue: unpaidThisMonth(bills),
      setAside: settings.setAside, investing: sipInvested(investments, cyc.start) + sipsDueBefore(investments, cyc.end), cycleStartDay: settings.cycleStartDay,
    });
    return r.status === 'noData' ? null : r;
  }, [transactions, vaults, settings, bills, investments]);
}

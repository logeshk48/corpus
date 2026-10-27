import { useAuth } from '@/context/AuthContext';
import { useSettings } from './useSettings';
import { subscribeTransactions } from '@/services/transactions';
import type { Transaction } from '@/types/transaction';
import { getRange, Period } from '@/utils/dates';
import { useEffect, useState } from 'react';

export function useTransactions(period: Period) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const cycleStart = settings.cycleStartDay ?? 1;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { start, end } = getRange(period, new Date(), cycleStart);
    setLoading(true);

    const unsubscribe = subscribeTransactions(
      start,
      end,
      (txs) => {
        setTransactions(txs);
        setLoading(false);
        setError(null);
      },
      (e) => {
        console.error('Transactions listener error:', e);
        setError('Could not load transactions');
        setLoading(false);
      }
    );

    return unsubscribe; // stop listening when the screen closes
  }, [user, period, cycleStart]);

  return { transactions, loading, error };
}
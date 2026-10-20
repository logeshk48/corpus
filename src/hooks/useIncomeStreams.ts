import { useAuth } from '@/context/AuthContext';
import { subscribeIncomeStreams } from '@/services/incomeStreams';
import type { IncomeStream } from '@/types/incomeStream';
import { useEffect, useState } from 'react';

export function useIncomeStreams() {
  const { user } = useAuth();
  const [streams, setStreams] = useState<IncomeStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStreams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeIncomeStreams(
      (s) => {
        setStreams(s);
        setLoading(false);
      },
      (e) => {
        console.error('Income streams listener error:', e);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  return { streams, loading };
}

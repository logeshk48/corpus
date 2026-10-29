import { useAuth } from '@/context/AuthContext';
import { subscribeInvestments } from '@/services/investments';
import type { Investment } from '@/types/investment';
import { useEffect, useState } from 'react';

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeInvestments(
      (l) => {
        setInvestments(l);
        setLoading(false);
      },
      (e) => {
        console.error('Investments listener error:', e);
        setLoading(false);
      }
    );
  }, [user]);
  return { investments, loading };
}

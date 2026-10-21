import { useAuth } from '@/context/AuthContext';
import { subscribeBills } from '@/services/bills';
import type { Bill } from '@/types/bill';
import { useEffect, useState } from 'react';

export function useBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBills([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeBills(
      (b) => {
        setBills(b);
        setLoading(false);
      },
      (e) => {
        console.error('Bills listener error:', e);
        setLoading(false);
      }
    );
  }, [user]);

  return { bills, loading };
}

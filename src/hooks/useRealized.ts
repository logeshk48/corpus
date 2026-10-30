import { useAuth } from '@/context/AuthContext';
import { subscribeRealized } from '@/services/realized';
import type { Realized } from '@/types/realized';
import { useEffect, useState } from 'react';

export function useRealized() {
  const { user } = useAuth();
  const [realized, setRealized] = useState<Realized[]>([]);
  useEffect(() => {
    if (!user) return setRealized([]);
    return subscribeRealized(setRealized, (e) => console.error('Realized listener error:', e));
  }, [user]);
  return realized;
}

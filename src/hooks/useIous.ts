import { useAuth } from '@/context/AuthContext';
import { subscribeIous } from '@/services/ious';
import type { Iou } from '@/types/iou';
import { useEffect, useState } from 'react';

export function useIous() {
  const { user } = useAuth();
  const [ious, setIous] = useState<Iou[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setIous([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeIous(
      (list) => {
        setIous(list);
        setLoading(false);
      },
      (e) => {
        console.error('IOU listener error:', e);
        setLoading(false);
      }
    );
  }, [user]);
  return { ious, loading };
}

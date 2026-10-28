import { useAuth } from '@/context/AuthContext';
import { subscribeAssets, subscribeSnapshots } from '@/services/assets';
import type { ManualAsset } from '@/types/asset';
import type { NwTotals } from '@/utils/netWorth';
import { useEffect, useState } from 'react';

export function useAssets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<ManualAsset[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, NwTotals>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const a = subscribeAssets(
      (x) => {
        setAssets(x);
        setLoading(false);
      },
      (e) => {
        console.error('Assets listener error:', e);
        setLoading(false);
      }
    );
    const s = subscribeSnapshots(setSnapshots);
    return () => {
      a();
      s();
    };
  }, [user]);
  return { assets, snapshots, loading };
}

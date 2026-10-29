import { saveSettings } from '@/services/settings';
import { fetchGoldRate } from '@/utils/goldPrice';
import { useEffect, useState } from 'react';
import { useSettings } from './useSettings';

// The gold rate everything uses: your custom price, or the live market price
// (last live price is remembered for offline use).
export function useGoldRate() {
  const { settings, loading } = useSettings();
  const g = settings.gold ?? {};
  const [live, setLive] = useState<{ rate: number; at: string } | null>(g.lastLive ?? null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading || g.mode === 'custom') return;
    let alive = true;
    const load = async () => {
      setFetching(true);
      const q = await fetchGoldRate();
      if (!alive) return;
      setFetching(false);
      if (!q) return;
      setLive({ rate: q.rate24k, at: q.at });
      // remember it, at most every 6 hours, so offline/next open still has a price
      const last = g.lastLive?.at ? new Date(g.lastLive.at).getTime() : 0;
      if (Date.now() - last > 6 * 3_600_000) saveSettings({ gold: { ...g, lastLive: { rate: q.rate24k, at: new Date().toISOString() } } }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [loading, g.mode]);

  const custom = g.mode === 'custom' && g.customRate24k ? g.customRate24k : null;
  return {
    rate: custom ?? live?.rate ?? null,
    mode: custom ? ('custom' as const) : ('live' as const),
    liveRate: live?.rate ?? null,
    liveAt: live?.at ?? null,
    fetching,
    setCustom: (rate: number) => saveSettings({ gold: { ...g, mode: 'custom', customRate24k: rate } }),
    useLive: () => saveSettings({ gold: { ...g, mode: 'live' } }),
  };
}

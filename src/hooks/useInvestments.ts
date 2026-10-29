import { useAuth } from '@/context/AuthContext';
import { subscribeInvestments, updateValue } from '@/services/investments';
import type { Investment } from '@/types/investment';
import { getLive, marketStatus, refKey, type LiveRef } from '@/utils/market';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type LiveInfo = {
  kind: LiveRef['kind'];
  price: number;           // share price or NAV
  change: number | null;   // per unit, vs previous close / previous NAV
  changePct: number | null;
  dayGain: number | null;  // units × change
  at: string;              // when the price is from
};

// Which live price a holding follows (if any)
export function liveRefOf(h: Investment): LiveRef | null {
  if (h.symbol) return { kind: 'stock', id: h.symbol };
  if (h.schemeCode) return { kind: 'fund', id: h.schemeCode };
  if (h.npsCode) return { kind: 'nps', id: h.npsCode };
  if (h.coinId) return { kind: 'crypto', id: h.coinId };
  return null;
}
// Linked = has units + a live source → valued live (units × price).
export const isLinked = (h: Investment) => !!h.units && h.units > 0 && !!liveRefOf(h);

export function useInvestments() {
  const { user } = useAuth();
  const [raw, setRaw] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Record<string, LiveInfo>>({});
  const [liveError, setLiveError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const saved = useRef(new Set<string>());

  useEffect(() => {
    if (!user) {
      setRaw([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeInvestments(
      (l) => {
        setRaw(l);
        setLoading(false);
      },
      (e) => {
        console.error('Investments listener error:', e);
        setLoading(false);
      }
    );
  }, [user]);

  const linked = useMemo(() => raw.filter(isLinked), [raw]);
  const key = linked.map((h) => `${h.id}:${refKey(liveRefOf(h)!)}:${h.units}`).join('|');

  const refresh = useCallback(async () => {
    if (!linked.length) return;
    try {
      const prices = await getLive(linked.map((h) => liveRefOf(h)!));
      const next: Record<string, LiveInfo> = {};
      for (const h of linked) {
        const ref = liveRefOf(h)!;
        const p = prices[refKey(ref)];
        const price = p?.price;
        if (!price) continue;
        next[h.id] = {
          kind: ref.kind,
          price,
          change: p.change,
          changePct: p.changePct,
          dayGain: p.change != null ? p.change * h.units! : null,
          at: p.time || new Date().toISOString(),
        };
        // keep the stored value roughly current (offline use, net-worth history) — at most once a day
        const v = Math.round(price * h.units!);
        const old = (Date.now() - new Date(h.valueAt).getTime()) / 86_400_000;
        if (old >= 1 && !saved.current.has(h.id) && Math.abs(v - h.value) > 1) {
          saved.current.add(h.id);
          updateValue(h, v).catch(() => {});
        }
      }
      setLive(next);
      setLiveError(false);
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      console.warn('Live prices unavailable', e);
      setLiveError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // refresh every minute while the market is open (every 15 min otherwise) and when the app comes back
  useEffect(() => {
    if (!linked.length) return;
    refresh();
    const t = setInterval(refresh, marketStatus().open ? 60_000 : 15 * 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearInterval(t);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // live-valued copies: value = units × price, so portfolio and net worth are live everywhere
  const investments = useMemo(
    () =>
      raw.map((h) => {
        const l = live[h.id];
        return l ? { ...h, value: Math.round(l.price * h.units!), valueAt: new Date().toISOString() } : h;
      }),
    [raw, live]
  );

  return { investments, raw, live, liveError, updatedAt, refresh, loading };
}

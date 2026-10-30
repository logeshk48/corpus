import { useAuth } from '@/context/AuthContext';
import { confirmSip, subscribeInvestments, updateInvestment, updateValue } from '@/services/investments';
import { AUTO_DAYS, pendingSips } from '@/utils/sip';
import { applyEvents, lotsOf } from '@/utils/corporateActions';
import type { Investment } from '@/types/investment';
import { getEvents, getLive, liveRefOf, marketStatus, refKey, type LiveRef } from '@/utils/market';
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

export { liveRefOf };
const sipLock = new Set<string>();
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

  // Once a day per stock: apply new splits / bonus issues and pick up dividends
  const checked = useRef(new Set<string>());
  useEffect(() => {
    const due = linked.filter(
      (h) => h.symbol && !h.symbol.startsWith('^') && !checked.current.has(h.id) && (!h.eventsAt || Date.now() - new Date(h.eventsAt).getTime() > 86_400_000)
    );
    due.forEach((h) => checked.current.add(h.id));
    (async () => {
      for (const h of due) {
        try {
          const first = lotsOf(h).reduce((a, l) => (l.date < a ? l.date : a), h.startDate);
          const from = h.eventsFrom && h.eventsFrom < first ? h.eventsFrom : first;
          const ev = await getEvents(h.symbol!, from);
          const changes = applyEvents(h, ev);
          if (changes) await updateInvestment(h.id, changes);
        } catch (e) {
          console.warn('Corporate actions check failed for', h.name, e);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // SIPs nobody answered for AUTO_DAYS → assume they went through (one per holding per pass;
  // the next snapshot handles the next month). Module-level lock: several screens use this hook.
  useEffect(() => {
    const old = pendingSips(raw).filter((p) => p.ageDays >= AUTO_DAYS && !sipLock.has(`${p.h.id}:${p.month}`));
    const seen = new Set<string>();
    for (const p of old) {
      if (seen.has(p.h.id)) continue;
      seen.add(p.h.id);
      sipLock.add(`${p.h.id}:${p.month}`);
      confirmSip(p.h, p, true).catch((e) => {
        sipLock.delete(`${p.h.id}:${p.month}`);
        console.warn('Auto SIP confirm failed', e);
      });
    }
  }, [raw]);

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

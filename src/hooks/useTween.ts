import { Duration } from '@/constants/motion';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Rolls a number from its last value to the new one (e.g. Safe to spend ticking down after you log a spend),
// so you see what your action changed. First render counts up from 0. Reduce Motion: jumps straight there.
export function useTween(raw: number, ms = Duration.number) {
  const target = Number.isFinite(raw) ? raw : 0;
  const [v, setV] = useState(0);
  const from = useRef(0);
  const cur = useRef(0);
  useEffect(() => {
    let raf = 0, alive = true;
    // Guarantee the final value even if frames are paused (app in background, hidden browser tab)
    const settle = setTimeout(() => { if (!alive) return; cancelAnimationFrame(raf); cur.current = target; setV(target); }, ms + 120);
    from.current = Number.isFinite(cur.current) ? cur.current : 0;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive) return;
      if (reduce) { cur.current = target; setV(target); return; }
      const start = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - start) / ms);
        const e = 1 - Math.pow(1 - p, 3);
        cur.current = from.current + (target - from.current) * e;
        setV(cur.current);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [target, ms]);
  return v;
}

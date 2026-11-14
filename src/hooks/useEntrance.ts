import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// 0 → 1 over `ms` with an ease-out, once per mount (or whenever `key` changes).
// Drives the one entrance moment on Today: rings filling, the amount counting up. Skipped when Reduce Motion is on.
export function useEntrance(ms = 900, key: unknown = 0) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) { setT(1); return; }
        const start = Date.now();
        const step = () => {
          const p = Math.min(1, (Date.now() - start) / ms);
          setT(1 - Math.pow(1 - p, 3));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      });
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [ms, key]);
  return t;
}

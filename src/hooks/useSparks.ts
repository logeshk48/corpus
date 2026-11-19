import { getChart, getCoinChart, getNavChart, getNpsChart, refKey, type LiveRef, type Range } from '@/utils/market';
import { useEffect, useState } from 'react';

// Small price histories for sparklines: { 'stock:RELIANCE.NS': [closes…] }. Uses the same cached
// chart calls as the detail sheet, so opening a stock after seeing its sparkline is instant.
export function useSparks(refs: LiveRef[], range: Range = '1mo') {
  const [map, setMap] = useState<Record<string, number[]>>({});
  const key = refs.map(refKey).sort().join(',');
  useEffect(() => {
    let alive = true;
    const one = (r: LiveRef) =>
      (r.kind === 'stock' ? getChart(r.id, range) : r.kind === 'fund' ? getNavChart(r.id, range) : r.kind === 'nps' ? getNpsChart(r.id, range) : getCoinChart(r.id, range))
        .then((c) => [refKey(r), c.points.map((p) => p.c)] as const)
        .catch(() => [refKey(r), [] as number[]] as const);
    Promise.all(refs.map(one)).then((all) => alive && setMap(Object.fromEntries(all)));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, range]);
  return map;
}

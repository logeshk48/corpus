import { Corpus } from '@/constants/theme';
import { getQuotes, INDICES, formatPct, formatPts, marketStatus, priceTime, type Quote } from '@/utils/market';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { m } from './Market.styles';

// NIFTY / SENSEX / BANK NIFTY, live. Tap one to open its chart.
export default function MarketStrip({ onOpen }: { onOpen: (symbol: string, name: string) => void }) {
  const [q, setQ] = useState<Record<string, Quote>>({});
  const [err, setErr] = useState(false);
  const status = marketStatus();
  useEffect(() => {
    let alive = true;
    const load = () =>
      getQuotes(INDICES.map((i) => i.symbol))
        .then((r) => alive && (setQ(r), setErr(false)))
        .catch(() => alive && setErr(true));
    load();
    const t = setInterval(load, status.open ? 60_000 : 15 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [status.open]);
  const time = Object.values(q)[0]?.time;
  return (
    <View style={{ gap: 6 }}>
      <View style={m.statusRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[m.dot, { backgroundColor: status.open ? Corpus.income : Corpus.textFaint }]} />
          <Text style={m.small}>{status.label}</Text>
        </View>
        <Text style={m.tiny}>{err ? 'Prices unavailable — retrying' : time ? `Updated ${priceTime(time)}` : 'Loading…'}</Text>
      </View>
      <View style={m.strip}>
        {INDICES.map((i) => {
          const x = q[i.symbol];
          const up = (x?.change ?? 0) >= 0;
          return (
            <Pressable key={i.symbol} style={m.index} onPress={() => onOpen(i.symbol, i.name)}>
              <Text style={m.indexName}>{i.name}</Text>
              <Text style={m.indexValue}>{formatPts(x?.price)}</Text>
              <Text style={[m.tiny, { color: x?.change == null ? Corpus.textFaint : up ? Corpus.income : Corpus.danger }]}>
                {x?.change == null ? ' ' : `${up ? '▲' : '▼'} ${formatPct(x.changePct)}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

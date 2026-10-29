import { Button } from '@/components/ui';
import { Corpus } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import type { NewInvestment } from '@/types/investment';
import { formatINR } from '@/utils/format';
import { parseHoldings, rankFunds, type ParsedRow } from '@/utils/importHoldings';
import { fundClassOf, getLive, searchFunds, searchStocks, shortSymbol, type LiveRef } from '@/utils/market';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { m } from './Market.styles';

type Match = ParsedRow & { ref: LiveRef | null; matched?: string; price?: number | null; on: boolean };
const WHEN = [
  { label: 'Within a year', months: 6 },
  { label: '1–2 years ago', months: 18 },
  { label: 'Over 2 years ago', months: 36 },
];
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

export default function ImportSheet({ onImport, onClose }: { onImport: (list: NewInvestment[]) => Promise<void>; onClose: () => void }) {
  const [kind, setKind] = useState<'stock' | 'fund'>('stock');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  const find = async () => {
    const parsed = parseHoldings(text);
    if (!parsed.length) return setMsg('Couldn’t read any holdings. Paste the table with its header row, or one per line like “TCS 10 3400”.');
    setMsg(null);
    setBusy(true);
    try {
      const out: Match[] = [];
      for (let i = 0; i < parsed.length; i += 4) {
        const part = await Promise.all(
          parsed.slice(i, i + 4).map(async (r): Promise<Match> => {
            try {
              if (kind === 'stock') {
                const hits = await searchStocks(r.name);
                const h = hits.find((x) => x.exchange === 'NSE') ?? hits[0];
                return { ...r, ref: h ? { kind: 'stock', id: h.symbol } : null, matched: h ? `${h.name} · ${shortSymbol(h.symbol)}` : undefined, on: !!h };
              }
              const hits = rankFunds(r.name, await searchFunds(r.name.replace(/[-–]/g, ' ')));
              const h = hits[0];
              return { ...r, ref: h ? { kind: 'fund', id: h.code } : null, matched: h?.name, on: !!h };
            } catch {
              return { ...r, ref: null, on: false };
            }
          })
        );
        out.push(...part);
      }
      const prices = await getLive(out.filter((r) => r.ref).map((r) => r.ref!)).catch(() => ({} as Record<string, { price: number | null; category?: string }>));
      setRows(out.map((r) => ({ ...r, price: r.ref ? prices[`${r.ref.kind}:${r.ref.id}`]?.price ?? null : null })));
    } finally {
      setBusy(false);
    }
  };

  const chosen = (rows ?? []).filter((r) => r.on && r.ref);
  const total = chosen.reduce((a, r) => a + r.qty * (r.price ?? r.avg ?? 0), 0);
  const save = async () => {
    setBusy(true);
    const date = monthsAgo(WHEN[when].months);
    try {
      await onImport(
        chosen.map((r) => {
          const avg = r.avg ?? r.price ?? 0;
          const name = (r.matched ?? r.name).split(' · ')[0].slice(0, 60);
          const gold = /gold|sgb/i.test(`${name} ${r.ref!.id}`);
          return {
            name,
            type: kind === 'fund' ? 'mf' : gold ? 'goldbond' : 'stock',
            units: r.qty,
            invested: Math.round(r.qty * avg),
            value: Math.round(r.qty * (r.price ?? avg)),
            valueAt: new Date().toISOString(),
            startDate: date,
            lots: [{ date, units: r.qty, price: avg }],
            ...(kind === 'stock' ? { symbol: r.ref!.id } : { schemeCode: r.ref!.id, fundClass: fundClassOf(undefined, name) }),
          } as NewInvestment;
        })
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={onClose} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.goldTint }]}>
              <Ionicons name="clipboard-outline" size={18} color={Corpus.gold} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>Import your holdings</Text>
              <Text style={sheet.subtitle}>Paste from your broker or fund app. We find each one and track it live.</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {!rows ? (
              <>
                <View style={sheet.chips}>
                  {(['stock', 'fund'] as const).map((k) => (
                    <Pressable key={k} style={[sheet.chip, kind === k && sheet.chipSuggested]} onPress={() => setKind(k)}>
                      <Text style={[sheet.chipText, kind === k && sheet.chipTextSuggested]}>{k === 'stock' ? 'Stocks & ETFs' : 'Mutual funds'}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={[f.input, { minHeight: 150, textAlignVertical: 'top' }]}
                  value={text}
                  onChangeText={setText}
                  multiline
                  placeholder={kind === 'stock' ? 'Instrument,Qty.,Avg. cost\nRELIANCE,10,2450\n\n— or one per line —\nTCS 5 3400\nHDFC Bank 12 1580' : 'Scheme Name,Units,Invested Value\n…\n\n— or one per line —\nParag Parikh Flexi Cap 152.3 65.6'}
                  placeholderTextColor={Corpus.textFaint}
                  autoCorrect={false}
                />
                <Text style={m.tiny}>
                  {kind === 'stock'
                    ? 'Zerodha: Kite → Holdings → Download (CSV), open it and copy all. Groww: Stocks → Holdings → Download statement. Any table with name, quantity and average price works. Typed lines: name, quantity, buy price.'
                    : 'Groww / Kuvera / Coin: download holdings and copy the table. Or from your CAS statement (camsonline.com / kfintech): scheme, units, invested. Typed lines: fund name, units, average NAV.'}
                </Text>
                {msg && <Text style={[m.small, { color: Corpus.warning }]}>{msg}</Text>}
                <Button label="Find them" icon="search" onPress={find} loading={busy} disabled={!text.trim()} />
              </>
            ) : (
              <>
                {rows.map((r, i) => (
                  <Pressable key={i} style={m.row} onPress={() => r.ref && setRows(rows.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}>
                    <Ionicons name={r.on ? 'checkbox' : 'square-outline'} size={20} color={r.ref ? (r.on ? Corpus.gold : Corpus.textMuted) : Corpus.textFaint} />
                    <View style={{ flex: 1 }}>
                      <Text style={m.rowName} numberOfLines={2}>{r.matched ?? r.name}</Text>
                      <Text style={[m.small, !r.ref && { color: Corpus.danger }]}>
                        {r.ref ? `${r.qty} × ${r.avg ? `₹${r.avg.toFixed(2)}` : 'today’s price'}${r.matched && r.matched.toLowerCase() !== r.name.toLowerCase() ? ` · you wrote “${r.name}”` : ''}` : `Not found: “${r.name}” — add it by search later`}
                      </Text>
                    </View>
                    {r.ref && <Text style={m.price}>{r.price ? formatINR(Math.round(r.qty * r.price)) : '—'}</Text>}
                  </Pressable>
                ))}
                <View style={{ gap: 6 }}>
                  <Text style={f.label}>ROUGHLY WHEN DID YOU BUY THESE? (FOR TAX)</Text>
                  <View style={sheet.chips}>
                    {WHEN.map((w, i) => (
                      <Pressable key={w.label} style={[sheet.chip, when === i && sheet.chipSuggested]} onPress={() => setWhen(i)}>
                        <Text style={[sheet.chipText, when === i && sheet.chipTextSuggested]}>{w.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={m.tiny}>You can fix exact dates later from each holding (Fix / Bought more).</Text>
                </View>
                {busy && <ActivityIndicator color={Corpus.gold} />}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button style={{ flex: 1 }} variant="secondary" label="Back" onPress={() => setRows(null)} />
                  <Button style={{ flex: 2 }} label={`Add ${chosen.length} · ${formatINR(Math.round(total))}`} onPress={save} loading={busy} disabled={!chosen.length} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

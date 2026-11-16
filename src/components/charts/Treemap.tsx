import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { compactINR } from '@/utils/format';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type TreeItem = { key: string; label: string; value: number; color: string };

// "Where your wealth sits": one block per kind of thing, bigger block = more money (ui-ux-pro-max: treemap for
// proportional structure, every block labelled). Small parts get a minimum size so they stay visible;
// the amounts written on the blocks are exact.
export default function Treemap({ items, height = 190, appear = 1 }: { items: TreeItem[]; height?: number; appear?: number }) {
  const list = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  const total = list.reduce((a, b) => a + b.value, 0);
  if (!total) return null;

  const block = (it: TreeItem, big: boolean) => {
    const pct = Math.round((it.value / total) * 100);
    return (
      <View style={{ flex: 1, backgroundColor: it.color, borderRadius: 14, padding: big ? 12 : 8, justifyContent: 'flex-end', opacity: 0.35 + 0.65 * appear, overflow: 'hidden' }}
        accessible accessibilityLabel={`${it.label}: ${compactINR(it.value)}, ${pct} percent`}>
        <Text style={{ fontSize: big ? Type.h1 : Type.label, fontFamily: Font.displayBold, color: 'white', ...tabular }} numberOfLines={1} adjustsFontSizeToFit>{pct < 1 ? '<1' : pct}%</Text>
        <Text style={{ fontSize: big ? Type.bodyLg : Type.small, fontFamily: Font.display, color: 'white' }} numberOfLines={1}>{it.label}</Text>
        {big && <Text style={{ fontSize: Type.body, color: 'white', opacity: 0.9, ...tabular }} numberOfLines={1}>{compactINR(it.value)}</Text>}
      </View>
    );
  };

  // slice the biggest off one side, then lay the rest out the other way
  const layout = (rest: TreeItem[], sum: number, horizontal: boolean, depth: number): ReactNode => {
    if (rest.length === 1) return block(rest[0], depth === 0);
    const [first, ...others] = rest;
    const share = Math.min(0.72, Math.max(0.34, first.value / sum));
    return (
      <View style={{ flex: 1, flexDirection: horizontal ? 'row' : 'column', gap: 4 }}>
        <View style={{ flex: share }}>{block(first, depth === 0)}</View>
        <View style={{ flex: 1 - share }}>{layout(others, sum - first.value, !horizontal, depth + 1)}</View>
      </View>
    );
  };

  return <View style={{ height, borderRadius: 16, overflow: 'hidden', backgroundColor: Corpus.card }}>{layout(list, total, true, 0)}</View>;
}

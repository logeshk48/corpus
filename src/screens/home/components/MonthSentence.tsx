import { Tap } from '@/components/ui';
import { CategoryChip, Chip, Corpus, Font, Marker, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type Bit = string | { mark: string; tone: keyof typeof Marker } | { pill: string; id: string; color?: string };

// The month in one sentence: plain words, one or two numbers marked like a highlighter,
// and category names as small pills you can tap. Laid out word by word so pills wrap with the text.
export function MonthSentence({ label, bits, onPill }: { label: string; bits: Bit[]; onPill: (id: string) => void }) {
  return (
    <View style={s.wrap} accessibilityRole="summary">
      <Text style={s.label}>{label}</Text>
      <View style={s.flow}>
        {bits.map((b, i) => {
          if (typeof b === 'string') {
            // punctuation hugs the word before it
            return <Fragment key={i}>{b.split(/(\s+)/).filter((w) => w.trim()).map((w, k) => <Text key={k} style={[s.word, /^[,.]/.test(w) && s.hug]}>{w}</Text>)}</Fragment>;
          }
          if ('mark' in b) return <Text key={i} style={[s.word, s.mark, { backgroundColor: Marker[b.tone] }]}>{b.mark}</Text>;
          return (
            <Tap key={i} onPress={() => onPill(b.id)} scaleTo={0.94} style={s.pill} accessibilityRole="link" accessibilityLabel={`Open ${b.pill}`}>
              <View style={[s.dot, { backgroundColor: b.color ?? CategoryChip[b.id] ?? Chip.gray }]} />
              <Text style={s.pillText}>{b.pill}</Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

// "November so far: ₹7,545, mostly Bills and Shopping. You kept 48% of what came in."
export function monthBits(p: { spent: number; income: number; rate: number | null; top: { id: string; label: string }[] }): Bit[] {
  const bits: Bit[] = [{ mark: formatINR(Math.round(p.spent)), tone: 'fact' }];
  if (p.top.length) {
    bits.push(', mostly');
    bits.push({ pill: p.top[0].label, id: p.top[0].id });
    if (p.top[1]) { bits.push('and'); bits.push({ pill: p.top[1].label, id: p.top[1].id }); }
  }
  bits.push('.');
  if (p.income > 0 && p.rate != null) {
    bits.push(p.rate >= 0 ? 'You kept' : 'You spent');
    bits.push({ mark: `${Math.abs(p.rate)}%`, tone: p.rate >= 20 ? 'good' : p.rate < 0 ? 'look' : 'fact' });
    bits.push(p.rate >= 0 ? 'of what came in.' : 'more than came in.');
  }
  return bits;
}

const s = StyleSheet.create({
  wrap: { gap: 8, paddingHorizontal: 4 },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.textMuted },
  flow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 6 },
  word: { fontSize: Type.h3, lineHeight: 28, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.3 },
  hug: { marginLeft: -6 },
  mark: { paddingHorizontal: 4, borderRadius: 6, overflow: 'hidden' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingLeft: 7, paddingRight: 11, borderRadius: 14, backgroundColor: Corpus.cardAlt },
  dot: { width: 12, height: 12, borderRadius: 4 },
  pillText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
});

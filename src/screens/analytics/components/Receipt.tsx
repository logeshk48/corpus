import { Corpus, Font, tabular, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Where the money went, printed like a receipt: a header with the dates, the lines, a dashed rule,
// the total, and a torn zigzag edge at the bottom.
export default function Receipt({ title, meta, total, children }: { title: string; meta: string; total: number; children: ReactNode }) {
  const [w, setW] = useState(0);
  const tooth = 12;
  let d = 'M0 0 ';
  for (let x = 0; x < w; x += tooth) d += `L${x + tooth / 2} 10 L${Math.min(w, x + tooth)} 0 `;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={s.paper}>
        <View style={s.head}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.meta}>{meta}</Text>
        </View>
        {children}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total spent</Text>
          <Text style={s.total}>{formatINR(Math.round(total))}</Text>
        </View>
      </View>
      {w > 0 && (
        <Svg width={w} height={12} style={{ marginTop: -1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Path d={d} fill={Corpus.card} stroke={Corpus.border} strokeWidth={1} strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  paper: { backgroundColor: Corpus.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 10, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, borderColor: Corpus.border },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.text },
  meta: { fontSize: Type.small, color: Corpus.textMuted },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: Corpus.textFaint },
  totalLabel: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  total: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
});

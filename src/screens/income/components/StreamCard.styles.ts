import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingRight: Space.md },
  row: { flex: 1, paddingVertical: 12, paddingLeft: Space.md, paddingRight: 10, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: Type.input, color: Corpus.text },
  subRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  sub: { flex: 1, fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18, ...tabular },
  amount: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  bar: { paddingLeft: 42 },
  paid: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36, paddingLeft: 10, paddingRight: 13, borderRadius: 18, backgroundColor: Corpus.cardAlt },
  paidOn: { backgroundColor: Corpus.gold },
  paidText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});

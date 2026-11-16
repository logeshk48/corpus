import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  summary: { backgroundColor: Corpus.card, borderRadius: 28, padding: 18, gap: 12 },
  sides: { flexDirection: 'row', gap: 12 },
  sideLabel: { fontSize: Type.body, color: Corpus.textMuted },
  sideValue: { fontSize: Type.h1, fontFamily: Font.displayBold, letterSpacing: -0.6, ...tabular },
  split: { flexDirection: 'row', height: 12, gap: 3 },
  splitSeg: { height: 12, borderRadius: 4 },
  net: { fontSize: Type.body, color: Corpus.textMuted },
  nudge: { flexDirection: 'row', gap: 12, backgroundColor: Corpus.card, borderRadius: 22, padding: 14 },
  nudgeTitle: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  nudgeText: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 9, paddingHorizontal: Space.md },
  rowBody: { flex: 1, gap: 1 },
  name: { fontSize: Type.input, color: Corpus.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: Type.body, color: Corpus.textMuted },
  amount: { fontSize: Type.input, fontFamily: Font.display, ...tabular },
  foot: { fontSize: Type.small, color: Corpus.textMuted, paddingHorizontal: 4 },
  empty: { borderRadius: 28, padding: 22, gap: 10, alignItems: 'flex-start', backgroundColor: Corpus.card },
  emptyTitle: { fontSize: Type.h1, fontFamily: Font.displayBold, letterSpacing: -0.5, color: Corpus.text },
  emptyText: { fontSize: Type.bodyLg, lineHeight: 21, color: Corpus.textMuted },
  skel: { backgroundColor: Corpus.card, borderRadius: 24 },
});

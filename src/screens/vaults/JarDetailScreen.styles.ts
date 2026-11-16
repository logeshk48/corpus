import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  skel: { backgroundColor: Corpus.card, borderRadius: 24 },
  muted: { fontSize: Type.bodyLg, color: Corpus.textMuted },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: Corpus.card, borderRadius: 28, padding: 18 },
  heroLabel: { fontSize: Type.body, color: Corpus.textMuted },
  heroAmount: { fontSize: Type.amount, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.8, ...tabular },
  goalText: { fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 20, ...tabular },
  link: { fontFamily: Font.display, color: Corpus.text, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 10 },
  warn: { backgroundColor: Corpus.card, borderRadius: 22, padding: 16, gap: 10 },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnTitle: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  warnText: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 19 },
  empty: { padding: Space.md, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8, paddingHorizontal: Space.md },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { fontSize: Type.input, color: Corpus.text },
  rowDate: { fontSize: Type.body, color: Corpus.textMuted },
  rowAmount: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  foot: { fontSize: Type.small, color: Corpus.textMuted, paddingHorizontal: 4 },
});

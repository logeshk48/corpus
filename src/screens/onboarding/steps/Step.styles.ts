import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

// Shared look for every setup question: a big plain question, one line under it, then the answers
export const styles = StyleSheet.create({
  wrap: { gap: Space.md },
  head: { gap: 8, marginBottom: 4 },
  title: { fontSize: Type.h1, lineHeight: 34, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.5 },
  sub: { fontSize: Type.input, lineHeight: 22, color: Corpus.textMuted },
  list: { gap: 10 },
  card: { backgroundColor: Corpus.card, borderRadius: 20, padding: Space.md, gap: Space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 },
  totalLabel: { fontSize: Type.input, color: Corpus.textMuted },
  totalValue: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  note: { fontSize: Type.body, lineHeight: 19, color: Corpus.textMuted, paddingHorizontal: 4 },
  daily: { backgroundColor: Corpus.card, borderRadius: 20, padding: Space.lg, alignItems: 'center', gap: 2 },
  dailyNum: { fontSize: Type.hero, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -1, ...tabular },
  dailyLabel: { fontSize: Type.body, color: Corpus.textMuted },
  dailySave: { fontSize: Type.body, fontFamily: Font.display, marginTop: 8, textAlign: 'center' },
});

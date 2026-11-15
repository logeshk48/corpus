import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8, paddingHorizontal: Space.md, backgroundColor: Corpus.card },
  rowPressed: { backgroundColor: Corpus.cardAlt },
  middle: { flex: 1, gap: 1 },
  note: { fontSize: Type.input, color: Corpus.text },
  meta: { fontSize: Type.body, color: Corpus.textMuted },
  amount: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  amountIncome: { color: Corpus.income },
});

import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, paddingHorizontal: Space.md },
  middle: { flex: 1, gap: 1 },
  name: { fontSize: Type.input, color: Corpus.text },
  spent: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  set: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: Corpus.cardAlt, justifyContent: 'center' },
  setText: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
});

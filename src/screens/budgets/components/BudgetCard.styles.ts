import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: Space.md, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  middle: { flex: 1, gap: 1 },
  name: { fontSize: Type.input, color: Corpus.text },
  meta: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  right: { alignItems: 'flex-end', gap: 1 },
  leftLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  left: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  bar: { paddingLeft: 42 },
});

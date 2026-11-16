import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingRight: Space.md },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, paddingLeft: Space.md, paddingRight: 10 },
  body: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: Type.input, color: Corpus.text },
  line: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  insight: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', marginTop: 2 },
  insightText: { flex: 1, fontSize: Type.small, lineHeight: 16 },
  balance: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  add: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

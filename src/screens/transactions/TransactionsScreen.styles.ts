import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Corpus.bg },
  content: { paddingHorizontal: Space.md },
  head: { gap: 12, marginBottom: Space.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, backgroundColor: Corpus.cardAlt, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: Type.input, color: Corpus.text },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4, paddingTop: Space.lg - 4, paddingBottom: 8 },
  dayTitle: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  dayMeta: { fontSize: Type.body, color: Corpus.textMuted, ...tabular },
  cell: { backgroundColor: Corpus.card, overflow: 'hidden' },
  cellFirst: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  cellLast: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: Corpus.border, marginLeft: 58 },
  empty: { alignItems: 'center', paddingVertical: 72, gap: Space.sm, paddingHorizontal: Space.lg },
  emptyTitle: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.text, marginTop: Space.sm, textAlign: 'center' },
  emptyText: { fontSize: Type.body, color: Corpus.textMuted, textAlign: 'center' },
});

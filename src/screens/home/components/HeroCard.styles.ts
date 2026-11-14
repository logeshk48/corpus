import { StyleSheet } from 'react-native';
import { Corpus, Font, Space, Type } from '@/constants/theme';

// Apple-style summary card: big number on the left, Activity rings on the right
export const styles = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: 26, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardCol: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  left: { flex: 1, gap: 2 },
  label: { fontSize: Type.label, fontWeight: '500', color: Corpus.textMuted },
  amount: { fontSize: Type.entry, fontFamily: Font.displayBold, fontWeight: '700', letterSpacing: -1 },
  context: { fontSize: Type.label },
  rings: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  inner: { position: 'absolute', top: 17, left: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm + 2 },
  chip: { borderRadius: 999, backgroundColor: Corpus.bg, paddingVertical: 5, paddingHorizontal: 10 },
  chipText: { fontSize: Type.small, color: Corpus.textMuted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Space.md - 2, paddingTop: Space.sm + 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  key: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Type.small, color: Corpus.textMuted, marginRight: 8 },
  howText: { fontSize: Type.small, fontWeight: '600', color: Corpus.gold },
  how: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: Space.sm + 2 },
  emptyText: { fontSize: Type.label, color: Corpus.textMuted, marginTop: 6, lineHeight: 21 },
  // older keys some code still passes
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

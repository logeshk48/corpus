import { Corpus, Font, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 4 },
  headText: { flex: 1, fontSize: Type.h3, fontFamily: Font.display, fontWeight: '700', color: Corpus.text },
  row: { gap: Space.sm, paddingVertical: 2, paddingRight: Space.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Corpus.card, borderRadius: 999, paddingLeft: 8, paddingRight: 16, minHeight: 46 },
  chipBusy: { opacity: 0.6 },
  name: { fontSize: Type.label, color: Corpus.text },
  amount: { fontSize: Type.label, color: Corpus.textMuted, fontWeight: '600' },
  more: { fontSize: Type.input, color: Corpus.gold },
});

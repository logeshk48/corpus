import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  headText: { flex: 1, fontSize: Type.caption, fontWeight: '600', letterSpacing: 0.8, color: Corpus.textMuted },
  row: { gap: Space.sm, paddingVertical: 2, paddingRight: Space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Corpus.card,
    borderWidth: 1,
    borderColor: Corpus.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  chipBusy: { borderColor: Corpus.gold },
  name: { fontSize: Type.bodyLg, color: Corpus.text },
  amount: { fontSize: Type.bodyLg, color: Corpus.gold, fontWeight: '600' },
  more: { fontSize: Type.body, color: Corpus.gold, fontWeight: '600' },
});

import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { gap: Space.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Corpus.card,
    borderWidth: 1,
    borderColor: Corpus.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: { fontSize: Type.body, color: Corpus.text },
  amount: { fontSize: Type.body, color: Corpus.gold, fontWeight: '600' },
});

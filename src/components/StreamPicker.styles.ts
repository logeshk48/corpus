import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
  },
  emptyText: {
    flex: 1,
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  emptyLink: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
});

import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Corpus.border,
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  amount: {
    fontSize: Type.hero,
    fontWeight: '500',
    marginTop: 4,
  },
  context: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space.sm,
    marginTop: Space.sm + 2,
  },
  chip: {
    borderRadius: 999,
    backgroundColor: Corpus.bg,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
  },
  how: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Space.sm + 2,
  },
  howText: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
  emptyText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
    lineHeight: 18,
  },
});

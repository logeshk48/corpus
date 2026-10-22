import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 120,
    gap: Space.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  summary: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  summaryAmount: {
    fontSize: Type.amount,
    fontWeight: '500',
    color: Corpus.income,
    marginTop: 4,
  },
  summarySub: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
    marginTop: 6,
  },
  list: {
    gap: Space.sm + 4,
  },
  unlinked: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xs,
  },
  unlinkedText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Space.sm,
  },
  emptyTitle: {
    fontSize: Type.label,
    color: Corpus.text,
  },
  emptyText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Space.sm,
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Space.lg,
  },
  emptyButtonText: {
    fontSize: Type.bodyLg,
    fontWeight: '600',
    color: Corpus.onGold,
  },
});

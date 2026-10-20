import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.card,
  },
  heading: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Corpus.gold,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1115',
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
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: '500',
    color: Corpus.income,
    marginTop: 4,
  },
  summarySub: {
    fontSize: 11,
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
    fontSize: 12,
    color: Corpus.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Space.sm,
  },
  emptyTitle: {
    fontSize: 15,
    color: Corpus.text,
  },
  emptyText: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1115',
  },
});

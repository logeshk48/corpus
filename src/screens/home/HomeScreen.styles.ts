import { Corpus, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 100,
    gap: Space.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: Space.sm,
  },
  budgets: {
    gap: Space.sm + 4,
  },
  recentList: {
    gap: Space.md,
  },
  loader: {
    paddingVertical: Space.lg,
  },
  emptyText: {
    fontSize: 12,
    color: Corpus.textMuted,
    paddingVertical: Space.md,
  },
  errorText: {
    fontSize: 12,
    color: Corpus.danger,
    paddingVertical: Space.md,
  },
});
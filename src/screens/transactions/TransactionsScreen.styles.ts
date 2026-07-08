import { Corpus, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    paddingBottom: 100,
    gap: Space.md,
  },
  heading: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Corpus.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: Space.sm,
  },
  list: {
    gap: Space.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  emptyTitle: {
    fontSize: 15,
    color: Corpus.text,
  },
  emptyText: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
});
import { Corpus, Radius, Space, Type } from '@/constants/theme';
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.card,
  },
  heading: {
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingHorizontal: Space.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: Type.body,
    color: Corpus.text,
  },
  summary: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  sectionTitle: {
    fontSize: Type.small,
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
    fontSize: Type.label,
    color: Corpus.text,
  },
  emptyText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
});
import { Corpus, Radius, Space } from '@/constants/theme';
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
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
  },
  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1D2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: Space.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space.sm,
  },
  sectionTitleInline: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '500',
    color: Corpus.gold,
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
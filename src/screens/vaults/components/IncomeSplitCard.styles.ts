import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.lg,
    gap: Space.md,
  },
  label: {
    fontSize: 11,
    color: Corpus.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  income: {
    fontSize: 32,
    fontWeight: '500',
    color: Corpus.text,
    textAlign: 'center',
    marginTop: -Space.sm,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: -Space.xs,
  },
  arrowText: {
    fontSize: 11,
    color: Corpus.textFaint,
  },
  tiles: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    paddingVertical: Space.sm + 4,
    paddingHorizontal: Space.sm,
    alignItems: 'center',
    gap: 3,
  },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
  },
  tileAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  tileSub: {
    fontSize: 10,
    color: Corpus.textFaint,
  },
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Corpus.bg,
  },
  empty: {
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.md,
  },
  emptyText: {
    fontSize: 12,
    color: Corpus.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});

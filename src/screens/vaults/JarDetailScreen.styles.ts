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
  hero: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.lg,
    alignItems: 'center',
    gap: Space.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  heroAmount: {
    fontSize: Type.amount,
    fontWeight: '600',
  },
  goalWrap: {
    width: '100%',
    gap: 6,
    marginTop: Space.xs,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Corpus.bg,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  goalText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingVertical: 13,
  },
  addText: {
    fontSize: Type.bodyLg,
    fontWeight: '600',
    color: Corpus.onGold,
  },
  outButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingVertical: 13,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    backgroundColor: Corpus.card,
  },
  outText: {
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.text,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Space.sm,
  },
  group: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
  pressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: Type.body,
    color: Corpus.text,
  },
  rowDate: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
    marginTop: 1,
  },
  rowAmount: {
    fontSize: Type.bodyLg,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Space.xl,
    gap: Space.sm,
  },
  emptyText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  muted: {
    fontSize: Type.bodyLg,
    color: Corpus.textMuted,
  },
});

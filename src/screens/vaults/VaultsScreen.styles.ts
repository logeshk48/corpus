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
    flex: 1,
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Corpus.gold,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  newText: {
    fontSize: Type.small,
    fontWeight: '600',
    color: Corpus.onGold,
  },
  hero: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.md,
    alignItems: 'center',
    gap: 4,
  },
  heroLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  heroAmount: {
    fontSize: Type.amount,
    fontWeight: '500',
    color: Corpus.gold,
  },
  heroSub: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  streak: {
    marginTop: Space.sm,
    borderRadius: 999,
    backgroundColor: Corpus.warningTint,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  streakText: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.warning,
  },
  plan: {
    alignSelf: 'stretch',
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
    gap: 6,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  planValue: {
    fontSize: Type.small,
    fontWeight: '600',
    color: Corpus.text,
  },
  planTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Corpus.bg,
    overflow: 'hidden',
  },
  planFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Corpus.gold,
  },
  planHint: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
  },
  tip: {
    backgroundColor: Corpus.goldTint,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.gold,
    padding: Space.md,
    gap: Space.sm + 2,
  },
  tipTop: {
    flexDirection: 'row',
    gap: Space.sm + 2,
  },
  tipText: {
    flex: 1,
    fontSize: Type.body,
    color: Corpus.text,
    lineHeight: 19,
  },
  tipMuted: {
    color: Corpus.textMuted,
  },
  tipActions: {
    flexDirection: 'row',
    gap: Space.sm,
    justifyContent: 'flex-end',
  },
  tipAdd: {
    backgroundColor: Corpus.gold,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  tipAddText: {
    fontSize: Type.small,
    fontWeight: '600',
    color: Corpus.onGold,
  },
  tipLater: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tipLaterText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  list: {
    gap: Space.sm + 4,
  },
  suggestLabel: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
    letterSpacing: 0.6,
    marginTop: Space.sm,
  },
  another: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Corpus.border,
    paddingVertical: 14,
  },
  anotherText: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.gold,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});

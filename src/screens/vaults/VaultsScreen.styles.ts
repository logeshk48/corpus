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
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1115',
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
    fontSize: 12,
    color: Corpus.textMuted,
    letterSpacing: 0.4,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '500',
    color: Corpus.gold,
  },
  heroSub: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  streak: {
    marginTop: Space.sm,
    borderRadius: 999,
    backgroundColor: '#2E1F12',
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F0A35E',
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
    fontSize: 12,
    color: Corpus.textMuted,
  },
  planValue: {
    fontSize: 12,
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
    fontSize: 11,
    color: Corpus.textFaint,
  },
  tip: {
    backgroundColor: '#1E1A0F',
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
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1115',
  },
  tipLater: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tipLaterText: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  list: {
    gap: Space.sm + 4,
  },
  suggestLabel: {
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.gold,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});

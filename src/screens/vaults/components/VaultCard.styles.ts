import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: Space.sm + 4,
  },
  pressed: {
    opacity: 0.8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: Corpus.text,
  },
  yearText: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 0.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  math: {
    backgroundColor: Corpus.bg,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: Space.sm + 4,
  },
  mathText: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  mathStrong: {
    color: Corpus.text,
    fontWeight: '500',
  },
  transfer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  transferText: {
    flex: 1,
    fontSize: 12,
    color: Corpus.text,
  },
  transferMuted: {
    color: Corpus.textMuted,
  },
  doneText: {
    flex: 1,
    fontSize: 12,
    color: Corpus.income,
    fontWeight: '500',
  },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  markText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1115',
  },
  undoText: {
    fontSize: 12,
    color: Corpus.textMuted,
    textDecorationLine: 'underline',
  },
  setup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setupText: {
    fontSize: 12,
    fontWeight: '500',
    color: Corpus.gold,
  },
});

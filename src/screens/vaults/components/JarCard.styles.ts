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
    opacity: 0.85,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    borderWidth: 0.5,
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  milestoneText: {
    fontSize: 10,
    fontWeight: '600',
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 11,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  month: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  balance: {
    fontSize: 20,
    fontWeight: '600',
  },
  goalWrap: {
    gap: 5,
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Corpus.bg,
    overflow: 'hidden',
  },
  fill: {
    height: 7,
    borderRadius: 4,
  },
  goalText: {
    fontSize: 11,
    color: Corpus.textMuted,
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
    gap: 5,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  addText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1115',
  },
  outButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.md,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    backgroundColor: Corpus.bg,
  },
  outText: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
});

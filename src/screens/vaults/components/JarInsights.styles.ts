import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: Space.sm + 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.text,
  },
  big: {
    fontSize: Type.h2,
    fontWeight: '600',
  },
  line: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    lineHeight: 18,
  },
  strong: {
    color: Corpus.text,
    fontWeight: '500',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  statusText: {
    flex: 1,
    fontSize: Type.small,
    fontWeight: '500',
  },
  link: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
  milestones: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mItem: {
    alignItems: 'center',
    gap: 4,
    width: 52,
  },
  mDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  mLabel: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
  },
  mLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginBottom: 18,
  },
  schedule: {
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  scheduleDate: {
    width: 64,
    fontSize: Type.small,
    color: Corpus.text,
  },
  schedulePct: {
    flex: 1,
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  note: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
    lineHeight: 17,
  },
});

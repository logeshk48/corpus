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
  title: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 12,
    color: Corpus.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -Space.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm + 4,
    backgroundColor: Corpus.bg,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.sm + 4,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  why: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  createText: {
    fontSize: 12,
    fontWeight: '600',
    color: Corpus.gold,
  },
  custom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Space.sm,
  },
  customText: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.gold,
  },
});

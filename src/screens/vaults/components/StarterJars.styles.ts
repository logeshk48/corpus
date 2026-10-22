import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

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
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
    textAlign: 'center',
  },
  text: {
    fontSize: Type.small,
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
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.text,
  },
  why: {
    fontSize: Type.caption,
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
    fontSize: Type.small,
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
    fontSize: Type.body,
    fontWeight: '500',
    color: Corpus.gold,
  },
});

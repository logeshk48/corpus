import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.gold,
    padding: Space.md,
    gap: Space.sm + 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  subtitle: {
    fontSize: 12,
    color: Corpus.textMuted,
    marginTop: -4,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2E2712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  blurb: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  apply: {
    fontSize: 12,
    fontWeight: '600',
    color: Corpus.gold,
  },
});

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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Space.sm,
  },
  list: {
    gap: Space.sm + 2,
  },
  group: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  monthlyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: 4,
  },
  monthlyText: {
    flex: 1,
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  monthlyAction: {
    fontSize: Type.small,
    fontWeight: '500',
    color: Corpus.gold,
  },
  welcome: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.xl,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.lg,
    alignItems: 'center',
    gap: Space.sm,
  },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Corpus.goldActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  welcomeTitle: {
    fontSize: Type.input,
    fontWeight: '500',
    color: Corpus.text,
  },
  welcomeText: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});

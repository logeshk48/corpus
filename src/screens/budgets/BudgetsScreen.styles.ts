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
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Space.sm,
  },
  sectionLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
    letterSpacing: 0.6,
  },
  sectionMeta: {
    fontSize: 11,
    color: Corpus.textFaint,
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
    fontSize: 12,
    color: Corpus.textMuted,
  },
  monthlyAction: {
    fontSize: 12,
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
    backgroundColor: '#2E2712',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xs,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Corpus.text,
  },
  welcomeText: {
    fontSize: 12,
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

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
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  helpText: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  explainer: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    padding: Space.md,
    gap: Space.md,
  },
  explainerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.text,
  },
  step: {
    flexDirection: 'row',
    gap: Space.sm + 4,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E2712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Corpus.gold,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Corpus.text,
  },
  stepText: {
    fontSize: 12,
    color: Corpus.textMuted,
    lineHeight: 18,
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
    gap: Space.sm + 4,
  },
  reminder: {
    flexDirection: 'row',
    gap: Space.sm + 2,
    backgroundColor: '#1A2530',
    borderRadius: Radius.md,
    padding: Space.md,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: Corpus.textMuted,
    lineHeight: 18,
  },
  reminderStrong: {
    color: Corpus.text,
    fontWeight: '500',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
  },
});

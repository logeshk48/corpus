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
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
  },

  // Profile card
  profileCard: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    padding: Space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Corpus.goldActive,
    borderWidth: 1,
    borderColor: Corpus.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Type.h3,
    fontWeight: '600',
    color: Corpus.gold,
  },
  profileName: {
    fontSize: Type.label,
    fontWeight: '500',
    color: Corpus.text,
  },
  profileEmail: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    marginTop: 2,
  },

  // Sections
  group: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  rowInput: {
    fontSize: Type.bodyLg,
    color: Corpus.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  rowValue: {
    fontSize: Type.bodyLg,
    color: Corpus.text,
    marginTop: 2,
  },
  rowHint: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rupee: {
    fontSize: Type.bodyLg,
    color: Corpus.textMuted,
  },
  fieldError: {
    fontSize: Type.caption,
    color: Corpus.danger,
    marginTop: 2,
  },

  // Save
  savedNote: {
    fontSize: Type.small,
    color: Corpus.income,
    textAlign: 'center',
  },

  // Account
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: Type.bodyLg,
    fontWeight: '500',
    color: Corpus.danger,
  },
  version: {
    fontSize: Type.caption,
    color: Corpus.textFaint,
    textAlign: 'center',
    marginTop: Space.md,
  },
});

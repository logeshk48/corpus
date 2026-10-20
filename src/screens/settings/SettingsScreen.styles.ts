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
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    fontSize: 17,
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
    borderRadius: 24,
    backgroundColor: '#2E2712',
    borderWidth: 1,
    borderColor: Corpus.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '600',
    color: Corpus.gold,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '500',
    color: Corpus.text,
  },
  profileEmail: {
    fontSize: 12,
    color: Corpus.textMuted,
    marginTop: 2,
  },

  // Sections
  sectionLabel: {
    fontSize: 11,
    color: Corpus.textMuted,
    letterSpacing: 0.6,
    marginTop: Space.sm,
  },
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
    fontSize: 12,
    color: Corpus.textMuted,
  },
  rowInput: {
    fontSize: 14,
    color: Corpus.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  rowValue: {
    fontSize: 14,
    color: Corpus.text,
    marginTop: 2,
  },
  rowHint: {
    fontSize: 11,
    color: Corpus.textFaint,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rupee: {
    fontSize: 14,
    color: Corpus.textMuted,
  },
  fieldError: {
    fontSize: 11,
    color: Corpus.danger,
    marginTop: 2,
  },

  // Save
  saveButton: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Corpus.cardAlt,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F1115',
  },
  saveTextDisabled: {
    color: Corpus.textFaint,
  },
  savedNote: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.danger,
  },
  version: {
    fontSize: 11,
    color: Corpus.textFaint,
    textAlign: 'center',
    marginTop: Space.md,
  },
});

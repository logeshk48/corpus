import { Corpus, Radius, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    padding: Space.lg,
    gap: Space.md,
  },
  heading: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
  },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Corpus.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Corpus.gold,
  },
  email: {
    fontSize: 14,
    color: Corpus.text,
  },
  memberSince: {
    fontSize: 11,
    color: Corpus.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: Corpus.danger,
    marginTop: Space.md,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.danger,
  },
});
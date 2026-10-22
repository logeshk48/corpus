import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Corpus.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Space.lg,
    gap: Space.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: Space.xl,
  },
  brand: {
    fontSize: Type.brand,
    fontWeight: '600',
    color: Corpus.gold,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: Type.small,
    color: Corpus.textMuted,
    marginTop: 6,
    letterSpacing: 0.6,
  },
  button: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Space.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Space.md,
  },
  switchText: {
    fontSize: Type.body,
    color: Corpus.textMuted,
  },
  switchLink: {
    fontSize: Type.body,
    color: Corpus.gold,
    fontWeight: '500',
  },
  formError: {
    fontSize: Type.body,
    color: Corpus.danger,
    textAlign: 'center',
  },
});
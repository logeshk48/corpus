import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  button: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Corpus.cardAlt,
  },
  label: {
    fontSize: Type.label,
    fontWeight: '600',
    color: Corpus.onGold,
  },
  labelDisabled: {
    color: Corpus.textFaint,
  },
});
import { Corpus, Radius, Space } from '@/constants/theme';
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
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1115',
  },
  labelDisabled: {
    color: Corpus.textFaint,
  },
});
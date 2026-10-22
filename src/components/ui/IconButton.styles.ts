import { Corpus } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.card,
    borderWidth: 1,
    borderColor: Corpus.border,
  },
  pressed: { backgroundColor: Corpus.cardAlt },
  disabled: { opacity: 0.4 },
});

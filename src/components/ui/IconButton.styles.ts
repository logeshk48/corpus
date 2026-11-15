import { Corpus } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  button: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Corpus.glass, borderWidth: 0.5, borderColor: Corpus.glassEdge,
    shadowColor: Corpus.shadow, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pressed: { backgroundColor: Corpus.cardAlt },
  disabled: { opacity: 0.4 },
});

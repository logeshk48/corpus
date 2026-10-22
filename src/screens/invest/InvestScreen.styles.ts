import { Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Corpus.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: Type.h2,
    fontWeight: '500',
    color: Corpus.text,
  },
  subtitle: {
    fontSize: Type.body,
    color: Corpus.textMuted,
  },
});
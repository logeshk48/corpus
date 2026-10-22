import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  name: {
    fontSize: Type.title,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.md,
  },
});
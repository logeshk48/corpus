import { Corpus, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 12,
    color: Corpus.textMuted,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.md,
  },
});
import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  notFound: {
    fontSize: Type.bodyLg,
    color: Corpus.textMuted,
  },
});

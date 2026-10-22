import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    paddingVertical: Space.sm + 4,
    paddingHorizontal: Space.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
  },
  label: {
    fontSize: Type.caption,
    color: Corpus.textMuted,
  },
  value: {
    fontSize: Type.input,
    fontWeight: '500',
    color: Corpus.text,
    marginTop: 2,
  },
});
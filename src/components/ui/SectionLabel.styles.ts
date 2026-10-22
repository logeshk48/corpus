import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Space.sm,
    paddingHorizontal: 2,
  },
  text: { fontSize: Type.caption, fontWeight: '600', letterSpacing: 0.8, color: Corpus.textMuted },
  meta: { fontSize: Type.caption, color: Corpus.textFaint },
});

import { Corpus, Font, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Space.sm,
    paddingHorizontal: 2,
  },
  text: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.textMuted },
  meta: { fontSize: Type.small, color: Corpus.textFaint },
});

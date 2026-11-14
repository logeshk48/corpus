import { Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingLeft: 6, paddingRight: 14, borderRadius: 20, backgroundColor: Corpus.card },
  text: { fontSize: Type.bodyLg, fontWeight: '500', color: Corpus.text },
  amount: { fontSize: Type.bodyLg, color: Corpus.textMuted },
});

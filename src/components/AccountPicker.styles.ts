import { Corpus, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { gap: Space.sm, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: Corpus.border, backgroundColor: Corpus.card, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { borderColor: Corpus.gold, backgroundColor: Corpus.goldActive },
  text: { fontSize: Type.body, color: Corpus.textMuted },
  textOn: { color: Corpus.gold, fontWeight: '600' },
});

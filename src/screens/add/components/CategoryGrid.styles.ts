import { Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, backgroundColor: Corpus.card, borderRadius: 22, paddingVertical: 16 },
  item: { width: '25%', alignItems: 'center', gap: 6 },
  ring: { padding: 3, borderRadius: 18, borderWidth: 2.5, borderColor: 'transparent' },
  label: { fontSize: Type.small, color: Corpus.textMuted },
  labelOn: { color: Corpus.text, fontWeight: '700' },
});

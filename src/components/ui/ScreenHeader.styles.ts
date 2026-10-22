import { Space, Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm + 4, minHeight: 40 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  title: { flexShrink: 1, fontSize: Type.title, fontWeight: '600', color: Corpus.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});

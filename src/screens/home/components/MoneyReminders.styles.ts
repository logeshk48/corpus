import { Corpus, Radius, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: { backgroundColor: Corpus.card, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Corpus.border, padding: Space.md, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { flex: 1, fontSize: Type.bodyLg, fontWeight: '600', color: Corpus.text },
  more: { fontSize: Type.small, color: Corpus.gold, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: Type.body, color: Corpus.text, fontWeight: '500' },
  body: { fontSize: Type.small, color: Corpus.textMuted, marginTop: 1 },
});

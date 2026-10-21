import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: Corpus.card,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
    gap: 10,
  },
  pressed: { opacity: 0.75 },
  top: { flexDirection: 'row', alignItems: 'center', gap: Space.sm + 4 },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 13, fontWeight: '500', color: Corpus.text },
  value: { fontSize: 12, fontWeight: '500', color: Corpus.textMuted },
  list: {
    gap: 8,
    borderTopWidth: 0.5,
    borderTopColor: Corpus.border,
    paddingTop: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  when: { width: 74, fontSize: 11, fontWeight: '500' },
  name: { flex: 1, fontSize: 12, color: Corpus.text },
  amount: { fontSize: 12, fontWeight: '600', color: Corpus.text },
  none: { fontSize: 11, color: Corpus.textFaint },
});

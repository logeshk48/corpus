import { Corpus, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  lead: { fontSize: Type.bodyLg, color: Corpus.textMuted, lineHeight: 21, paddingHorizontal: 4 },
  skel: { backgroundColor: Corpus.card, borderRadius: 24 },
});

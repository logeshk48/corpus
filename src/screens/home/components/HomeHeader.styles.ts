import { Corpus, Font, Space, Type } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: Type.small,
    color: Corpus.textMuted,
  },
  name: {
    fontSize: Type.h3,
    fontFamily: Font.display,
    color: Corpus.text,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Corpus.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { fontSize: Type.micro, fontWeight: '700', color: Corpus.text },
});

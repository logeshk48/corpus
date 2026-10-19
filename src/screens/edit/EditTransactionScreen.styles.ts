import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space } from '@/constants/theme';

export const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Corpus.card,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: Space.sm,
  },
  notFound: {
    fontSize: 14,
    color: Corpus.textMuted,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: Corpus.danger,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: Corpus.danger,
  },
});

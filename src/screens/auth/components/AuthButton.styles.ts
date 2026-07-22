import { Corpus, Radius, Space } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  button: {
    backgroundColor: Corpus.gold,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space.sm,
    minHeight: 50,
  },
  buttonLoading: {
    backgroundColor: Corpus.goldSoft,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F1115',
  },
});
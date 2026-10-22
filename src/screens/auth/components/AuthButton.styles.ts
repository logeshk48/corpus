import { Corpus, Radius, Space, Type } from '@/constants/theme';
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
    fontSize: Type.label,
    fontWeight: '600',
    color: Corpus.onGold,
  },
});
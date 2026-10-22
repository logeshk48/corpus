import { StyleSheet } from 'react-native';
import { Corpus, Radius, Space, Type } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96, // floats above the tab bar
    alignItems: 'center',
    paddingHorizontal: Space.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    width: '100%',
    maxWidth: 440,
    backgroundColor: Corpus.cardAlt,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Corpus.border,
    paddingVertical: 12,
    paddingHorizontal: Space.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: Type.body,
    color: Corpus.text,
  },
  action: {
    fontSize: Type.body,
    fontWeight: '600',
    color: Corpus.gold,
    letterSpacing: 0.3,
  },
});

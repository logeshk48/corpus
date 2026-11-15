import { Corpus, Space } from '@/constants/theme';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavChrome, type ChromeOptions } from './NavChrome';

// A pushed screen with the iOS large title: wraps content in a scroll view under the fixed nav bar.
// For long lists use useNavChrome directly with a FlatList / SectionList (see TransactionsScreen).
export default function Screen({ children, contentStyle, keyboard, ...chrome }: ChromeOptions & { children: ReactNode; contentStyle?: StyleProp<ViewStyle>; keyboard?: boolean }) {
  const c = useNavChrome(chrome);
  return (
    <View style={st.root}>
      <Animated.ScrollView
        {...c.scrollProps}
        contentContainerStyle={[st.content, { paddingTop: c.padTop, paddingBottom: c.padBottom }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboard ? 'handled' : undefined}
      >
        {c.title}
        {children}
      </Animated.ScrollView>
      {c.bar}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  content: { paddingHorizontal: Space.md, gap: Space.md + 2 },
});

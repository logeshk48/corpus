import Aura from '@/components/fx/Aura';
import { Chip, Corpus, Space } from '@/constants/theme';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useNavChrome, type ChromeOptions } from './NavChrome';

// Each main screen has its own colour of light behind the title
const TONES: Record<string, string> = {
  Accounts: Chip.blue, Budgets: Chip.orange, People: Chip.pink, Jars: Chip.yellow, Income: Chip.green, 'Net worth': Chip.indigo, Bills: Chip.red,
};

// Sections arrive one after another, 55 ms apart (fragments are opened up so each card counts)
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((c) => (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? flatten(c.props.children) : [c]));
}

// A pushed screen with the iOS large title: wraps content in a scroll view under the fixed nav bar.
// For long lists use useNavChrome directly with a FlatList / SectionList (see TransactionsScreen).
export default function Screen({ children, contentStyle, keyboard, tone, ...chrome }: ChromeOptions & {
  children: ReactNode; contentStyle?: StyleProp<ViewStyle>; keyboard?: boolean; tone?: string;
}) {
  const c = useNavChrome(chrome);
  const color = tone ?? TONES[chrome.title];
  return (
    <View style={st.root}>
      {color && (
        <Animated.View style={[st.aura, { opacity: c.scrollY.interpolate({ inputRange: [0, 240], outputRange: [1, 0.25], extrapolate: 'clamp' }) }]} pointerEvents="none">
          <Aura color={color} />
        </Animated.View>
      )}
      <Animated.ScrollView
        {...c.scrollProps}
        contentContainerStyle={[st.content, { paddingTop: c.padTop, paddingBottom: c.padBottom }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboard ? 'handled' : undefined}
      >
        {c.title}
        {flatten(children).map((child, i) => (
          <Reanimated.View key={isValidElement(child) && child.key != null ? child.key : i} entering={FadeInDown.delay(Math.min(i, 8) * 55).duration(380)}>
            {child}
          </Reanimated.View>
        ))}
      </Animated.ScrollView>
      {c.bar}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  content: { paddingHorizontal: Space.md, gap: Space.md + 2 },
});

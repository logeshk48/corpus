import { Field } from '@/components/ui';
import { Corpus, Font, Type } from '@/constants/theme';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { styles } from './Step.styles';
import type { StepProps } from './types';

// The first thing after sign-up: the app says hello, and the hello answers back as you type your name
export default function WelcomeStep({ answers, update }: StepProps) {
  const name = answers.name.trim().split(' ')[0];
  return (
    <View style={styles.wrap}>
      <Animated.View entering={ZoomIn.springify().damping(13)} style={s.brand}>
        <Image source={require('../../../../assets/images/icon.png')} style={s.icon} accessibilityIgnoresInvertColors />
      </Animated.View>
      <View style={[styles.head, { alignItems: 'center' }]}>
        <Animated.Text key={name ? 'named' : 'plain'} entering={FadeIn.duration(220)} style={s.hello} accessibilityRole="header">
          {name ? `Hi, ${name}` : 'Welcome to Corpus'}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(320)} style={[styles.sub, { textAlign: 'center' }]}>
          Five quick questions and Corpus will work out what you can spend each day. Change any answer later in Settings.
        </Animated.Text>
      </View>
      <Animated.View entering={FadeInDown.delay(260).duration(320)} style={styles.card}>
        <Field label="What should Corpus call you?" value={answers.name} onChangeText={(n) => update({ name: n })} placeholder="Your first name" maxLength={30} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: 'center', marginTop: 12, marginBottom: 4 },
  icon: { width: 72, height: 72, borderRadius: 20 },
  hello: { fontSize: Type.amount, lineHeight: 40, fontFamily: Font.brand, color: Corpus.text, letterSpacing: -1.2, textAlign: 'center' },
});

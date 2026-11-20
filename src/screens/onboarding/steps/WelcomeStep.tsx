import { Field } from '@/components/ui';
import { Corpus, Font, Type } from '@/constants/theme';
import { Image, StyleSheet, Text, View } from 'react-native';
import { styles } from './Step.styles';
import type { StepProps } from './types';

export default function WelcomeStep({ answers, update }: StepProps) {
  return (
    <View style={styles.wrap}>
      <View style={s.brand}>
        <Image source={require('../../../../assets/images/icon.png')} style={s.icon} accessibilityIgnoresInvertColors />
        <Text style={s.word}>Corpus</Text>
      </View>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">What should Corpus call you?</Text>
        <Text style={styles.sub}>Then four quick questions about your money, about a minute in all. You can change any answer later in Settings.</Text>
      </View>
      <View style={styles.card}>
      <Field label="First name" value={answers.name} onChangeText={(name) => update({ name })} placeholder="Your first name" maxLength={30} autoComplete="given-name" textContentType="givenName" returnKeyType="next" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 10 },
  word: { fontSize: Type.h2, fontFamily: Font.brand, color: Corpus.text, letterSpacing: -0.5 },
});

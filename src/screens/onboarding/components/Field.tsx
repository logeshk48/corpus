import { Corpus } from '@/constants/theme';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { styles } from './Field.styles';

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  hint?: string;
  money?: boolean; // shows ₹ and keeps digits only
  autoFocus?: boolean;
  maxLength?: number;
};

export default function Field({ label, value, onChangeText, placeholder, hint, money, autoFocus, maxLength }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused]}>
        {money && <Text style={styles.prefix}>₹</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => onChangeText(money ? t.replace(/[^0-9]/g, '') : t)}
          placeholder={placeholder}
          placeholderTextColor={Corpus.textFaint}
          keyboardType={money ? 'number-pad' : 'default'}
          autoFocus={autoFocus}
          maxLength={money ? 9 : maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

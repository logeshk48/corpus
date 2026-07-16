import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { styles } from './AuthInput.styles';

type AuthInputProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
};

export default function AuthInput({ label, icon, error, ...inputProps }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <Ionicons name={icon} size={16} color={Corpus.textFaint} />
        <TextInput
          style={styles.input}
          placeholderTextColor={Corpus.textFaint}
          {...inputProps}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
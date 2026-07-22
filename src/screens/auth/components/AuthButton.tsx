import { ActivityIndicator, Pressable, Text } from 'react-native';
import { styles } from './AuthButton.styles';

type AuthButtonProps = {
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export default function AuthButton({ label, loading = false, onPress }: AuthButtonProps) {
  return (
    <Pressable
      style={[styles.button, loading && styles.buttonLoading]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#0F1115" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
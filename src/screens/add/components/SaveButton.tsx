import { Pressable, Text } from 'react-native';
import { styles } from './SaveButton.styles';

type SaveButtonProps = {
  enabled: boolean;
  onPress: () => void;
};

export default function SaveButton({ enabled, onPress }: SaveButtonProps) {
  return (
    <Pressable
      style={[styles.button, !enabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={!enabled}
    >
      <Text style={[styles.label, !enabled && styles.labelDisabled]}>
        Save transaction
      </Text>
    </Pressable>
  );
}
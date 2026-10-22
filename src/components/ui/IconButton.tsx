import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { styles } from './IconButton.styles';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string; // for screen readers, e.g. "Back", "Edit bill"
  disabled?: boolean;
};

// Round icon-only button (back, edit, close). 36px visual, 56px touch area.
export default function IconButton({ icon, onPress, label, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={icon === 'chevron-back' ? 20 : 17} color={Corpus.text} />
    </Pressable>
  );
}

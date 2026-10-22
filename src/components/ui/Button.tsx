import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import { styles } from './Button.styles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant; // primary (gold) by default
  size?: 'lg' | 'sm';      // lg = full-width action, sm = pill (headers, inline)
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;     // put the icon after the label (e.g. arrow-forward)
  loading?: boolean;
  disabled?: boolean;
  tint?: string;           // custom fill for a primary button (e.g. a jar's colour)
  style?: StyleProp<ViewStyle>;
};

const TEXT: Record<ButtonVariant, string> = {
  primary: Corpus.onGold,
  secondary: Corpus.text,
  ghost: Corpus.gold,
  quiet: Corpus.textMuted,
  danger: Corpus.danger,
};

// The one button used across Corpus.
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading,
  disabled,
  tint,
  style,
}: Props) {
  const inactive = disabled || loading;
  const color = disabled ? Corpus.textFaint : TEXT[variant];
  const iconEl = icon ? <Ionicons name={icon} size={size === 'lg' ? 17 : 14} color={color} /> : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        tint && variant === 'primary' ? { backgroundColor: tint } : null,
        disabled && variant !== 'ghost' && variant !== 'quiet' && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <>
          {!iconRight && iconEl}
          <Text style={[size === 'lg' ? styles.labelLg : styles.labelSm, { color }]}>{label}</Text>
          {iconRight && iconEl}
        </>
      )}
    </Pressable>
  );
}

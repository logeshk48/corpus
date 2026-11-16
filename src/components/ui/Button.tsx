import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, type StyleProp, type ViewStyle } from 'react-native';
import Tap from './Tap';
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
  tintText?: string;       // label colour on that fill (jar colours are light, so black)
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
  tintText,
  style,
}: Props) {
  const inactive = disabled || loading;
  const color = disabled ? Corpus.textFaint : tint && tintText && variant === 'primary' ? tintText : TEXT[variant];
  const iconEl = icon ? <Ionicons name={icon} size={size === 'lg' ? 17 : 14} color={color} /> : null;

  return (
    <Tap
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        tint && variant === 'primary' ? { backgroundColor: tint } : null,
        disabled && variant !== 'ghost' && variant !== 'quiet' && styles.disabled,
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
    </Tap>
  );
}

import { Chip } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

// Flat icon chip: a white symbol on a coloured squircle (the iOS Settings convention).
// `icon` is an Ionicons name, or "mci:<name>" for Material Community icons (bank, credit-card-chip…).
export default function IconChip({ icon, color = Chip.gray, size = 30 }: { icon: string; color?: string; size?: number }) {
  const glyph = Math.round(size * 0.56);
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: color, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {icon.startsWith('mci:') ? (
        <MaterialCommunityIcons name={icon.slice(4) as keyof typeof MaterialCommunityIcons.glyphMap} size={glyph} color="white" />
      ) : (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={glyph} color="white" />
      )}
    </View>
  );
}

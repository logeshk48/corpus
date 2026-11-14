import { Chip } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

// Apple Settings-style icon: a white symbol on a coloured rounded square
export default function IconChip({ icon, color = Chip.gray, size = 30 }: { icon: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={Math.round(size * 0.58)} color="white" />
    </View>
  );
}

import { Chip, Font, Type } from '@/constants/theme';
import { Text, View } from 'react-native';

// A person's initial on a colour picked from their name, so the same person always has the same colour
const PALETTE = [Chip.blue, Chip.teal, Chip.indigo, Chip.purple, Chip.pink, Chip.orange];
export const personColor = (name: string) => PALETTE[[...name.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];

export default function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: personColor(name), alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ color: 'white', fontFamily: Font.displayBold, fontSize: size > 44 ? Type.h3 : Type.label }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

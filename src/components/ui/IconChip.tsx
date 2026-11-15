import { Chip } from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';

// Glossy app-icon chip: a white symbol on a coloured squircle with a soft top light.
// `icon` is an Ionicons name, or "mci:<name>" for Material Community icons (bank, credit-card-chip…).
const GLOSS = 'linear-gradient(160deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.10) 100%)';
const gloss = Platform.OS === 'web' ? ({ backgroundImage: GLOSS } as object) : ({ experimental_backgroundImage: GLOSS } as object);

export default function IconChip({ icon, color = Chip.gray, size = 30 }: { icon: string; color?: string; size?: number }) {
  const r = Math.round(size * 0.3);
  const glyph = Math.round(size * 0.56);
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: r, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.35)' }, gloss]} pointerEvents="none" />
      {icon.startsWith('mci:') ? (
        <MaterialCommunityIcons name={icon.slice(4) as keyof typeof MaterialCommunityIcons.glyphMap} size={glyph} color="white" />
      ) : (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={glyph} color="white" />
      )}
    </View>
  );
}

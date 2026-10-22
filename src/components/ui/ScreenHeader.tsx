import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import IconButton from './IconButton';
import { styles } from './ScreenHeader.styles';

type Props = {
  title?: string;
  icon?: string;        // optional Ionicons glyph before the title
  iconColor?: string;
  onBack?: () => void;  // defaults to going back, or Home if there's no history
  right?: ReactNode;    // e.g. <Button size="sm" … /> or <IconButton … />
};

// The top row of every pushed screen: back · title · actions
export default function ScreenHeader({ title, icon, iconColor = Corpus.gold, onBack, right }: Props) {
  const router = useRouter();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View style={styles.row}>
      <IconButton icon="chevron-back" label="Back" onPress={goBack} />
      <View style={styles.titleWrap}>
        {icon && <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={iconColor} />}
        {!!title && (
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        )}
      </View>
      {right && <View style={styles.actions}>{right}</View>}
    </View>
  );
}

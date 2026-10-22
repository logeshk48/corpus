import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './ModeCard.styles';

type Props = {
  title: string;
  line: string;
  insight: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
};

// A tappable "how do you earn" card. Several can be selected at once.
export default function ModeCard({ title, line, insight, icon, selected, onPress }: Props) {
  const glyph = (selected ? icon : `${icon}-outline`) as keyof typeof Ionicons.glyphMap;
  return (
    <Pressable
      style={[styles.card, selected && styles.cardOn]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
    >
      <View style={styles.top}>
        <View style={[styles.icon, selected && styles.iconOn]}>
          <Ionicons name={glyph} size={20} color={selected ? Corpus.bg : Corpus.gold} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected && <Ionicons name="checkmark" size={15} color={Corpus.bg} />}
        </View>
      </View>
      {selected && (
        <View style={styles.insight}>
          <Ionicons name="sparkles" size={13} color={Corpus.gold} style={{ marginTop: 2 }} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      )}
    </Pressable>
  );
}

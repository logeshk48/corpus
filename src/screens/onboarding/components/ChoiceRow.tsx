import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { styles } from './ChoiceRow.styles';

type Props = {
  title: string;
  sub?: string;
  extra?: string;   // gold detail line (goal, recommendation reason)
  badge?: string;   // e.g. "RECOMMENDED"
  icon?: string;
  iconColor?: string;
  amount?: string;  // right-aligned figure (budget options)
  selected: boolean;
  mode: 'check' | 'radio';
  onPress: () => void;
};

// One selectable row: used for budget styles (radio) and starter jars (check)
export default function ChoiceRow({ title, sub, extra, badge, icon, iconColor = Corpus.gold, amount, selected, mode, onPress }: Props) {
  return (
    <Pressable
      style={[styles.row, selected && styles.rowOn]}
      onPress={onPress}
      accessibilityRole={mode === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
    >
      {icon && (
        <View style={[styles.icon, { backgroundColor: iconColor + '22' }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={19} color={iconColor} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {!!badge && <Text style={styles.badge}>{badge}</Text>}
        </View>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
        {!!extra && <Text style={styles.extra}>{extra}</Text>}
      </View>
      {amount ? (
        <View style={styles.right}>
          <Text style={styles.amount}>{amount}</Text>
        </View>
      ) : null}
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected &&
          (mode === 'check' ? (
            <Ionicons name="checkmark" size={15} color={Corpus.bg} />
          ) : (
            <View style={styles.radioDot} />
          ))}
      </View>
    </Pressable>
  );
}

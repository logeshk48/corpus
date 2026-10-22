import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { styles } from './SectionLabel.styles';

type Props = {
  children: string;  // the label; shown in uppercase
  right?: ReactNode; // a short meta string or a small link
};

// "MONEY", "THIS MONTH · ₹4,200" — the label above a group of cards
export default function SectionLabel({ children, right }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.text} accessibilityRole="header">
        {children.toUpperCase()}
      </Text>
      {typeof right === 'string' ? <Text style={styles.meta}>{right}</Text> : right}
    </View>
  );
}

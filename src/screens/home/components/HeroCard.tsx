import { Text, View } from 'react-native';
import { styles } from './HeroCard.styles';

export default function HeroCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Safe to spend today</Text>
      <Text style={styles.amount}>₹1,240</Text>
      <Text style={styles.context}>
        After bills, tax vault and savings · 8 days to month end
      </Text>
    </View>
  );
}
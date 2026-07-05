import { Text, View } from 'react-native';
import { styles } from './InvestScreen.styles';

export default function InvestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invest</Text>
      <Text style={styles.subtitle}>Your wealth engine, coming soon</Text>
    </View>
  );
}
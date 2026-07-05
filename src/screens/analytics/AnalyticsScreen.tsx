import { Text, View } from 'react-native';
import { styles } from './AnalyticsScreen.styles';

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Your money story, coming soon</Text>
    </View>
  );
}
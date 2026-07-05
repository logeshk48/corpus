import { Text, View } from 'react-native';
import { styles } from './AddScreen.styles';

export default function AddScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add</Text>
      <Text style={styles.subtitle}>Quick capture, coming soon</Text>
    </View>
  );
}
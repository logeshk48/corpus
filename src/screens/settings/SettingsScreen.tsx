import { Text, View } from 'react-native';
import { styles } from './SettingsScreen.styles';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Make Corpus yours</Text>
    </View>
  );
}
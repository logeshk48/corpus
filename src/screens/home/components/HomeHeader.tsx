import { Corpus } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './HomeHeader.styles';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeHeader() {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>Logesh</Text>
      </View>
      <View style={styles.actions}>
        <Ionicons name="notifications-outline" size={20} color={Corpus.textMuted} />
        <Ionicons name="lock-closed-outline" size={20} color={Corpus.textMuted} />
      </View>
    </View>
  );
}
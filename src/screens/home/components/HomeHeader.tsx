import { Corpus } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { styles } from './HomeHeader.styles';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Saved name → email prefix ("logesh" from logesh@...) → generic
function displayNameFor(saved: string | undefined, email: string | null | undefined) {
  if (saved?.trim()) return saved.trim();
  const prefix = email?.split('@')[0];
  if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  return 'there';
}

export default function HomeHeader() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const name = displayNameFor(settings.displayName, user?.email);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.actions}>
        <Ionicons name="notifications-outline" size={20} color={Corpus.textMuted} />
        <Ionicons name="lock-closed-outline" size={20} color={Corpus.textMuted} />
      </View>
    </View>
  );
}
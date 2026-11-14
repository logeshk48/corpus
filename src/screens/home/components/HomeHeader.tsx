import { Corpus } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useInbox } from '@/hooks/useInbox';
import { useRouter, type Href } from 'expo-router';
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
  const router = useRouter();
  const { attention } = useInbox();

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Apple large-title header: date line + round glass buttons, then a big "Today"
  return (
    <View style={styles.wrap}>
      <View style={styles.container}>
        <Text style={styles.greeting} numberOfLines={1}>{today}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.round} onPress={() => router.push('/inbox' as Href)} accessibilityLabel={`Reminders${attention ? `, ${attention} need attention` : ''}`}>
            <Ionicons name="notifications-outline" size={19} color={Corpus.text} />
            {attention > 0 && <View style={styles.dot} />}
          </Pressable>
          <Pressable style={[styles.round, styles.avatar]} onPress={() => router.push('/settings' as Href)} accessibilityLabel="Profile and settings">
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.name} accessibilityRole="header">Today</Text>
    </View>
  );
}

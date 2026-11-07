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

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/inbox' as Href)} hitSlop={10} accessibilityLabel={`Reminders${attention ? `, ${attention} need attention` : ''}`}>
          <Ionicons name={attention ? 'notifications' : 'notifications-outline'} size={20} color={attention ? Corpus.gold : Corpus.textMuted} />
          {attention > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{attention > 9 ? '9+' : attention}</Text>
            </View>
          )}
        </Pressable>
        <Ionicons name="lock-closed-outline" size={20} color={Corpus.textMuted} />
      </View>
    </View>
  );
}
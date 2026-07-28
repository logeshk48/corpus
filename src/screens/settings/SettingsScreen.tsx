import { Corpus } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { logOut } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './SettingsScreen.styles';

export default function SettingsScreen() {
  const { user } = useAuth();

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  const handleLogout = async () => {
    await logOut();
    // AuthGate detects the sign-out and redirects to /login automatically
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.email}>{user?.email ?? 'Not signed in'}</Text>
            <Text style={styles.memberSince}>Corpus member</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Corpus.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
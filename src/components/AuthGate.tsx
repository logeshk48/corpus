import { Corpus } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // not logged in, trying to see the app → bounce to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // logged in, sitting on login/signup → send into the app
      router.replace('/');
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Corpus.gold} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Corpus.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
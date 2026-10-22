import { Corpus, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Decides where a person belongs:
//   signed out            → login
//   signed in, not set up → onboarding
//   signed in, set up     → the app
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === 'onboarding';
  const needsOnboarding = !!user && !settingsLoading && !settings.onboardedAt;

  useEffect(() => {
    if (initializing) return;

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    } else if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, initializing, inAuthGroup, inOnboarding, needsOnboarding]);

  // While we don't know yet, cover the app instead of unmounting it —
  // the navigator must stay mounted for router.replace to work.
  const deciding =
    initializing || (!!user && settingsLoading) || (needsOnboarding && !inOnboarding);

  return (
    <View style={styles.root}>
      {!initializing && children}
      {deciding && (
        <View style={styles.splash}>
          <Text style={styles.brand}>CORPUS</Text>
          <ActivityIndicator color={Corpus.gold} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  splash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Corpus.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  brand: { fontSize: Type.brand, fontWeight: '600', color: Corpus.gold, letterSpacing: 2 },
});

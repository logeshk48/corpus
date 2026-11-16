import AuthGate from '@/components/AuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { isDark } from '@/constants/theme';
import { watchSystemTheme } from '@/services/theme';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  // The web build is pre-rendered without knowing the saved theme, so draw only in the browser
  const [mounted, setMounted] = useState(Platform.OS !== 'web');
  useEffect(() => { setMounted(true); return watchSystemTheme(); }, []);
  const [fontsReady, fontError] = useFonts({
    'Inter-SemiBold': require('../../assets/fonts/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter_700Bold.ttf'),
  });
  if (!mounted || (!fontsReady && !fontError)) return null; // a blink on first launch; system font if loading fails
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider>
      <ToastProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGate>
          {/* Forward = slide in from the right with the previous screen parallaxing back (same on Android and iPhone);
              things you summon (Ask, bank SMS) rise from the bottom; switching auth/app crossfades. */}
          <Stack screenOptions={{ headerShown: false, animation: 'ios_from_right', fullScreenGestureEnabled: true, gestureEnabled: true }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="edit/[id]" />
            <Stack.Screen name="income/index" />
            <Stack.Screen name="income/[id]" />
            <Stack.Screen name="budgets" />
            <Stack.Screen name="vaults" />
            <Stack.Screen name="vault/[id]" />
            <Stack.Screen name="bills" />
            <Stack.Screen name="bill/[id]" />
            <Stack.Screen name="category/[id]" />
            <Stack.Screen name="ious" />
            <Stack.Screen name="accounts" />
            <Stack.Screen name="networth" />
            <Stack.Screen name="wealth" />
            <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="sms-review" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="debts" />
            <Stack.Screen name="inbox" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="tax" />
          </Stack>
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
    </GestureHandlerRootView>
  );
}
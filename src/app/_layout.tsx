import AuthGate from '@/components/AuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { isDark } from '@/constants/theme';
import { watchSystemTheme } from '@/services/theme';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  // The web build is pre-rendered without knowing the saved theme, so draw only in the browser
  const [mounted, setMounted] = useState(Platform.OS !== 'web');
  useEffect(() => { setMounted(true); return watchSystemTheme(); }, []);
  if (!mounted) return null;
  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
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
            <Stack.Screen name="ask" />
            <Stack.Screen name="sms-review" />
            <Stack.Screen name="debts" />
            <Stack.Screen name="inbox" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="tax" />
          </Stack>
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
  );
}
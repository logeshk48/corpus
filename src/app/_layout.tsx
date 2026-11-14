import AuthGate from '@/components/AuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Bricolage-SemiBold': require('../../assets/fonts/BricolageGrotesque_600SemiBold.ttf'),
    'Bricolage-Bold': require('../../assets/fonts/BricolageGrotesque_700Bold.ttf'),
  });
  if (!loaded && !error) return null; // a moment on first launch; falls back to the system font on error
  return (
    <AuthProvider>
      <ToastProvider>
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
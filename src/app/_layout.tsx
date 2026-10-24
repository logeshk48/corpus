import AuthGate from '@/components/AuthGate';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
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
          </Stack>
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
  );
}
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
            <Stack.Screen name="transactions" />
            <Stack.Screen name="edit/[id]" />
          </Stack>
        </AuthGate>
      </ToastProvider>
    </AuthProvider>
  );
}
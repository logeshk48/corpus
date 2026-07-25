import { signIn } from '@/services/auth';
import { friendlyAuthError } from '@/utils/authErrors';
import { validateEmail, validatePassword } from '@/utils/validation';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthButton from './components/AuthButton';
import AuthInput from './components/AuthInput';
import { styles } from './LoginScreen.styles';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e !== undefined)) return;

    setLoading(true);
    setFormError(undefined);
    try {
      const user = await signIn(email, password);
      console.log('Signed in:', user.uid);
      router.replace('/');
    } catch (e: any) {
      setFormError(friendlyAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>CORPUS</Text>
          <Text style={styles.tagline}>Earn. Spend. Invest. Grow.</Text>
        </View>

        <AuthInput
          label="EMAIL"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />

        <AuthInput
          label="PASSWORD"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          error={errors.password}
        />

        {formError && <Text style={styles.formError}>{formError}</Text>}

        <AuthButton label="Sign in" loading={loading} onPress={handleLogin} />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>New to Corpus?</Text>
          <Link href="/signup">
            <Text style={styles.switchLink}>Create account</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
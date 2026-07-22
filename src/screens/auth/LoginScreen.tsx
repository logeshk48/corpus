import { validateEmail, validatePassword } from '@/utils/validation';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthButton from './components/AuthButton';
import AuthInput from './components/AuthInput';
import { styles } from './LoginScreen.styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e !== undefined)) return;

    setLoading(true);
    console.log('LOGIN:', { email });
    setTimeout(() => setLoading(false), 1500); // simulates network — real call tomorrow
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
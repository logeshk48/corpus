import { validateConfirm, validateEmail, validatePassword } from '@/utils/validation';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthButton from './components/AuthButton';
import AuthInput from './components/AuthInput';
import { styles } from './SignupScreen.styles';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
  }>({});

  const handleSignup = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirm(password, confirm),
    };
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((e) => e !== undefined);
    if (hasErrors) return;

    setLoading(true);
    console.log('SIGNUP:', { email });
    setTimeout(() => setLoading(false), 1500); // simulates network — real call tomorrow
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>CORPUS</Text>
          <Text style={styles.tagline}>Your money, commanded.</Text>
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
          placeholder="Minimum 6 characters"
          secureTextEntry
          error={errors.password}
        />

        <AuthInput
          label="CONFIRM PASSWORD"
          icon="shield-checkmark-outline"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat your password"
          secureTextEntry
          error={errors.confirm}
        />

        <AuthButton label="Create account" loading={loading} onPress={handleSignup} />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account?</Text>
          <Link href="/login">
            <Text style={styles.switchLink}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
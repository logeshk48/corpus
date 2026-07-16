import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthInput from './components/AuthInput';
import { styles } from './LoginScreen.styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('LOGIN:', { email });
    // Firebase wiring — Day 8
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
        />

        <AuthInput
          label="PASSWORD"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonLabel}>Sign in</Text>
        </Pressable>

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
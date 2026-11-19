import Aura from '@/components/fx/Aura';
import { Button, Field, Segmented } from '@/components/ui';
import { Chip, Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { resetPassword, signIn, signUp } from '@/services/auth';
import { friendlyAuthError } from '@/utils/authErrors';
import { validateConfirm, validateEmail, validatePassword } from '@/utils/validation';
import { useTween } from '@/hooks/useTween';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useId, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const PRIVACY = 'https://corpus-fawn-eight.vercel.app/privacy';
const APath = Animated.createAnimatedComponent(Path);
const DEMO = 48; // the example daily number on the gauge
const FILL = 0.72; // how far round the arc it reaches
const MS = 1400;

// The one moving thing on this screen: the daily number's arc draws itself in once.
function Gauge({ width = 220 }: { width?: number }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const stroke = 12;
  const r = (width - stroke) / 2;
  const h = r + stroke;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${r + stroke / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${r + stroke / 2}`;
  const p = useSharedValue(reduce ? FILL : 0);
  // the number counts up from ₹0 in step with the arc
  const [goal, setGoal] = useState(reduce ? DEMO : 0);
  const shown = useTween(goal, MS);
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setGoal(DEMO), 250);
    p.value = withDelay(250, withTiming(FILL, { duration: MS, easing: Easing.out(Easing.cubic) }));
    return () => clearTimeout(t);
  }, [reduce, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.value) }));
  return (
    <View style={{ width, height: h }} accessible accessibilityLabel={`Example: ${formatINR(DEMO)} safe to spend today`}>
      <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
        <Svg width={width} height={h}>
          <Defs>
            <LinearGradient id={`g${id}`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={Chip.teal} />
              <Stop offset="1" stopColor={Corpus.income} />
            </LinearGradient>
          </Defs>
          <Path d={d} stroke={Corpus.border} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          <APath d={d} stroke={`url(#g${id})`} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={props} />
        </Svg>
      </View>
      <View style={s.gaugeIn}>
        <Text style={s.gaugeNum}>{formatINR(Math.round(shown))}</Text>
        <Text style={s.gaugeSub}>safe to spend today</Text>
      </View>
    </View>
  );
}

// Sign in and Create account on one screen, switched by a segmented control. Following Baymard and
// web.dev: no "confirm password" box (a show-password eye instead), autofill hints so the phone's password
// manager can fill both fields, errors under the field they belong to, and a forgotten password one tap away.
export default function AuthScreen({ mode: start }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [mode, setMode] = useState(start);
  const signup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const conf = useRef<TextInput>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const pw = useRef<TextInput>(null);

  const switchTo = (m: 'login' | 'signup') => { setMode(m); setErrors({}); setFormError(null); setSent(null); };

  const submit = async () => {
    const e = { email: validateEmail(email), password: validatePassword(password), confirm: signup ? validateConfirm(password, confirm) : undefined };
    setErrors(e);
    setSent(null);
    if (e.email || e.password || e.confirm) return;
    setBusy(true);
    setFormError(null);
    try {
      if (signup) await signUp(email, password);
      else await signIn(email, password);
      router.replace('/');
    } catch (err: any) {
      setFormError(friendlyAuthError(err?.code ?? ''));
      if (err?.code === 'auth/email-already-in-use') setMode('login');
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (validateEmail(email)) return setErrors({ email: 'Type your email first, then tap Forgot password' });
    setErrors({});
    setFormError(null);
    try {
      await resetPassword(email);
      setSent(email.trim());
    } catch (err: any) {
      setFormError(err?.code === 'auth/network-request-failed' ? friendlyAuthError(err.code) : 'Could not send the email. Check the address and try again.');
    }
  };

  return (
    <View style={s.root}>
      <View style={s.aura} pointerEvents="none"><Aura color={Chip.green} second={Chip.teal} /></View>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.col}>
              <View style={s.brand}>
                <Image source={require('../../../assets/images/icon.png')} style={s.icon} accessibilityIgnoresInvertColors />
                <Text style={s.word} accessibilityRole="header">Corpus</Text>
                <Text style={s.tagline}>Know what you can safely spend today.</Text>
              </View>

              <View style={s.hero}>
                <Gauge />
                <Text style={s.example}>An example of your daily number</Text>
              </View>

              <View style={s.card}>
                <Segmented options={[{ value: 'login', label: 'Sign in' }, { value: 'signup', label: 'Create account' }] as const} value={mode} onChange={switchTo} />

                <Field
                  label="Email"
                  value={email}
                  onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                  onSubmitEditing={() => pw.current?.focus()}
                  error={errors.email}
                />
                <View style={{ gap: signup ? Space.md : 10 }}>
                  <Field
                    ref={pw}
                    label="Password"
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                    placeholder={signup ? 'At least 6 characters' : 'Your password'}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    textContentType={signup ? 'newPassword' : 'password'}
                    returnKeyType={signup ? 'next' : 'go'}
                    onSubmitEditing={() => (signup ? conf.current?.focus() : submit())}
                    error={errors.password}
                    right={
                      <Pressable onPress={() => setShow(!show)} hitSlop={10} style={s.eye} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Corpus.textMuted} />
                      </Pressable>
                    }
                  />
                  {signup && (
                    <Field
                      ref={conf}
                      label="Confirm password"
                      value={confirm}
                      onChangeText={(t) => { setConfirm(t); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
                      placeholder="Type it again"
                      secureTextEntry={!show}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={submit}
                      error={errors.confirm}
                      hint={confirm && confirm === password ? 'Passwords match' : undefined}
                    />
                  )}
                  {!signup && (
                    <Pressable onPress={forgot} hitSlop={8} style={s.forgot} accessibilityRole="button">
                      <Text style={s.link}>Forgot password?</Text>
                    </Pressable>
                  )}
                </View>

                {sent && (
                  <Animated.View entering={FadeIn.duration(200)} style={s.note} accessibilityLiveRegion="polite">
                    <Ionicons name="mail-outline" size={18} color={Corpus.income} />
                    <Text style={s.noteText}>If {sent} has an account, a link to set a new password is on its way. Check spam too.</Text>
                  </Animated.View>
                )}
                {formError && (
                  <Animated.View entering={FadeIn.duration(200)} style={[s.note, { borderColor: Corpus.danger }]} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={18} color={Corpus.danger} />
                    <Text style={s.noteText}>{formError}</Text>
                  </Animated.View>
                )}

                <Button label={signup ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />
              </View>

              <Text style={s.legal}>
                Your entries stay in your account. No bank login, no ads.{'\n'}
                <Text style={s.legalLink} onPress={() => Linking.openURL(PRIVACY)} accessibilityRole="link">Privacy policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Corpus.bg },
  aura: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  content: { flexGrow: 1, paddingHorizontal: Space.lg, paddingVertical: Space.lg, justifyContent: 'center' },
  col: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: Space.lg },
  brand: { alignItems: 'center', gap: 6 },
  icon: { width: 60, height: 60, borderRadius: 16, marginBottom: 6 },
  word: { fontSize: Type.entry, lineHeight: 50, fontFamily: Font.brand, color: Corpus.text, letterSpacing: -1.2, textAlign: 'center' },
  tagline: { fontSize: Type.input, lineHeight: 22, color: Corpus.textMuted, textAlign: 'center' },
  hero: { alignItems: 'center', gap: 8 },
  gaugeIn: { position: 'absolute', left: 0, right: 0, bottom: -4, alignItems: 'center' },
  gaugeNum: { fontSize: Type.h1, lineHeight: 34, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.5, ...tabular },
  gaugeSub: { fontSize: Type.small, color: Corpus.textMuted },
  example: { fontSize: Type.small, color: Corpus.textFaint, textAlign: 'center' },
  card: { backgroundColor: Corpus.card, borderRadius: 24, padding: Space.lg - 4, gap: Space.md },
  eye: { paddingHorizontal: 4, alignSelf: 'stretch', justifyContent: 'center' },
  forgot: { alignSelf: 'flex-end' },
  link: { fontSize: Type.body, color: Corpus.text, fontFamily: Font.display, textDecorationLine: 'underline' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: Corpus.income, borderRadius: 14, padding: 12 },
  noteText: { flex: 1, fontSize: Type.body, color: Corpus.text, lineHeight: 20 },
  legal: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center', lineHeight: 20 },
  legalLink: { color: Corpus.text, fontFamily: Font.display, textDecorationLine: 'underline' },
});

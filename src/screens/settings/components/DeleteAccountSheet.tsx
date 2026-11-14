import { Corpus, Radius, Type } from '@/constants/theme';
import { styles as sheet } from '@/screens/budgets/components/BudgetEditorSheet.styles';
import { styles as f } from '@/screens/ious/components/IouSheet.styles';
import { deleteMyAccount } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// Delete the Corpus account and every entry in it. Required by Google Play for apps with sign-up.
export default function DeleteAccountSheet({ visible, onClose, onExport }: { visible: boolean; onClose: () => void; onExport: () => void }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!visible) return null;
  const close = () => { setPw(''); setErr(''); onClose(); };

  const go = async () => {
    setBusy(true); setErr('');
    try {
      await deleteMyAccount(pw);
      // signed out automatically — the app returns to the login screen
    } catch (e: any) {
      const code = String(e?.code ?? '');
      setErr(code.includes('wrong-password') || code.includes('invalid-credential') ? 'That password is wrong.'
        : code.includes('too-many-requests') ? 'Too many tries. Wait a few minutes and try again.'
        : code.includes('network') ? 'No connection. Connect to the internet and try again.'
        : 'Couldn’t delete the account. Try again.');
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={sheet.overlay}>
        <Pressable style={sheet.backdrop} onPress={close} />
        <View style={[sheet.sheet, { maxHeight: '92%' }]}>
          <View style={sheet.handle} />
          <View style={sheet.header}>
            <View style={[sheet.iconCircle, { backgroundColor: Corpus.dangerTint }]}>
              <Ionicons name="trash-outline" size={18} color={Corpus.danger} />
            </View>
            <View style={sheet.titleBlock}>
              <Text style={sheet.title}>Delete your account</Text>
              <Text style={sheet.subtitle}>This can’t be undone</Text>
            </View>
            <Pressable style={sheet.closeButton} onPress={close} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={Corpus.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={f.body} keyboardShouldPersistTaps="handled">
            <Text style={s.body}>
              Corpus will permanently delete your login and everything in it: transactions, accounts, budgets, bills, jars,
              investments, people and settings. Reminders on this phone stop too.
            </Text>
            <Pressable onPress={onExport} hitSlop={6}>
              <Text style={s.link}>Download your data first (CSV)</Text>
            </Pressable>
            <View style={f.field}>
              <Text style={f.label}>YOUR PASSWORD</Text>
              <TextInput
                style={f.input} value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none"
                placeholder="Enter it to confirm" placeholderTextColor={Corpus.textFaint} accessibilityLabel="Password"
              />
            </View>
            {!!err && <Text style={[s.body, { color: Corpus.danger }]}>{err}</Text>}
            <Pressable style={[s.btn, (!pw || busy) && { opacity: 0.5 }]} disabled={!pw || busy} onPress={go} accessibilityRole="button">
              {busy ? <ActivityIndicator color={Corpus.text} /> : <Text style={s.btnText}>Delete account and data</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  body: { fontSize: Type.body, color: Corpus.text, lineHeight: 20 },
  link: { fontSize: Type.body, color: Corpus.gold, fontWeight: '600' },
  btn: { marginTop: 4, backgroundColor: Corpus.danger, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center' },
  btnText: { fontSize: Type.body, fontWeight: '600', color: Corpus.text },
});

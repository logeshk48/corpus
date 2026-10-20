import { Corpus } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { logOut } from '@/services/auth';
import { saveSettings } from '@/services/settings';
import { formatINR } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './SettingsScreen.styles';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading } = useSettings();

  // Drafts: what's typed but not yet saved
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When saved settings arrive (or change elsewhere), refresh the drafts
  useEffect(() => {
    setName(settings.displayName ?? '');
    setBudget(settings.monthlyBudget ? String(settings.monthlyBudget) : '');
  }, [settings.displayName, settings.monthlyBudget]);

  const savedName = settings.displayName ?? '';
  const savedBudget = settings.monthlyBudget;
  const budgetNumber = budget.trim() === '' ? undefined : Number(budget);
  const budgetInvalid =
    budgetNumber !== undefined && (!Number.isFinite(budgetNumber) || budgetNumber <= 0);
  const isDirty = name.trim() !== savedName || budgetNumber !== savedBudget;
  const canSave = isDirty && !budgetInvalid && !saving;

  const shownName = savedName || user?.email?.split('@')[0] || 'Corpus member';
  const initial = shownName.charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await saveSettings({
        displayName: name.trim() || undefined,
        monthlyBudget: budgetNumber,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error('Save settings failed:', e);
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{shownName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Corpus.gold} style={{ paddingVertical: 24 }} />
        ) : (
          <>
            {/* PROFILE */}
            <Text style={styles.sectionLabel}>PROFILE</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="person-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Display name</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="How should Corpus greet you?"
                    placeholderTextColor={Corpus.textFaint}
                    maxLength={30}
                  />
                </View>
              </View>
            </View>

            {/* MONEY */}
            <Text style={styles.sectionLabel}>MONEY</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="wallet-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Monthly budget</Text>
                  <View style={styles.inlineRow}>
                    <Text style={styles.rupee}>₹</Text>
                    <TextInput
                      style={[styles.rowInput, { flex: 1 }]}
                      value={budget}
                      onChangeText={setBudget}
                      placeholder="e.g. 25000"
                      placeholderTextColor={Corpus.textFaint}
                      keyboardType="numeric"
                    />
                  </View>
                  {budgetInvalid ? (
                    <Text style={styles.fieldError}>Enter an amount greater than 0</Text>
                  ) : savedBudget ? (
                    <Text style={styles.rowHint}>Currently {formatINR(savedBudget)} per month</Text>
                  ) : (
                    <Text style={styles.rowHint}>Used by budgets and Safe-to-Spend</Text>
                  )}
                </View>
              </View>
            </View>

            {/* PREFERENCES */}
            <Text style={styles.sectionLabel}>PREFERENCES</Text>
            <View style={styles.group}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="cash-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Currency</Text>
                  <Text style={styles.rowValue}>Indian Rupee (₹)</Text>
                </View>
              </View>
              <View style={[styles.row, styles.rowDivider]}>
                <View style={styles.rowIcon}>
                  <Ionicons name="moon-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Theme</Text>
                  <Text style={styles.rowValue}>Charcoal & Gold</Text>
                </View>
                <Text style={styles.rowHint}>More soon</Text>
              </View>
            </View>

            {/* Save */}
            <Pressable
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              {saving ? (
                <ActivityIndicator color="#0F1115" />
              ) : (
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
                  Save changes
                </Text>
              )}
            </Pressable>
            {justSaved && <Text style={styles.savedNote}>Saved ✓</Text>}
            {error && <Text style={styles.fieldError}>{error}</Text>}
          </>
        )}

        {/* ACCOUNT */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.group}>
          <Pressable style={styles.logoutRow} onPress={() => logOut()}>
            <Ionicons name="log-out-outline" size={18} color={Corpus.danger} />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Corpus · v0.13 · Earn. Spend. Invest. Grow.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

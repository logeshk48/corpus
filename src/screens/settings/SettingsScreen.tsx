import { Button, SectionLabel } from '@/components/ui';
import { Corpus, Space } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { logOut } from '@/services/auth';
import { saveSettings } from '@/services/settings';
import { formatINR } from '@/utils/format';
import { WORK_MODES } from '@/utils/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './SettingsScreen.styles';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading } = useSettings();
  const router = useRouter();
  const earnLabel =
    WORK_MODES.filter((m) => settings.workModes?.includes(m.id))
      .map((m) => m.title)
      .join(' + ') || 'Not set';

  // Drafts: what's typed but not yet saved
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [aside, setAside] = useState('');
  const [cycle, setCycle] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When saved settings arrive (or change elsewhere), refresh the drafts
  useEffect(() => {
    setName(settings.displayName ?? '');
    setBudget(settings.monthlyBudget ? String(settings.monthlyBudget) : '');
    setAside(settings.setAside ? String(settings.setAside) : '');
    setCycle(settings.cycleStartDay && settings.cycleStartDay > 1 ? String(settings.cycleStartDay) : '');
  }, [settings.displayName, settings.monthlyBudget, settings.setAside, settings.cycleStartDay]);

  const savedName = settings.displayName ?? '';
  const savedBudget = settings.monthlyBudget;
  const budgetNumber = budget.trim() === '' ? undefined : Number(budget);
  const budgetInvalid =
    budgetNumber !== undefined && (!Number.isFinite(budgetNumber) || budgetNumber <= 0);
  const asideNumber = aside.trim() === '' ? undefined : Number(aside);
  const cycleNumber = cycle.trim() === '' || Number(cycle) <= 1 ? undefined : Math.min(28, Number(cycle));
  const isDirty =
    name.trim() !== savedName ||
    budgetNumber !== savedBudget ||
    asideNumber !== settings.setAside ||
    cycleNumber !== settings.cycleStartDay;
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
        setAside: asideNumber,
        cycleStartDay: cycleNumber,
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
            <SectionLabel>PROFILE</SectionLabel>
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
            <SectionLabel>MONEY</SectionLabel>
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

            <View style={[styles.group, { marginTop: Space.sm }]}>
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="lock-closed-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>Keep aside</Text>
                  <View style={styles.inlineRow}>
                    <Text style={styles.rupee}>₹</Text>
                    <TextInput
                      style={[styles.rowInput, { flex: 1 }]}
                      value={aside}
                      onChangeText={(t) => setAside(t.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={Corpus.textFaint}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.rowHint}>Money in your account that is not for spending. Corpus leaves it out of Safe to spend</Text>
                </View>
              </View>
              <View style={[styles.row, styles.rowDivider]}>
                <View style={styles.rowIcon}>
                  <Ionicons name="calendar-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>My month starts on</Text>
                  <TextInput
                    style={styles.rowInput}
                    value={cycle}
                    onChangeText={(t) => setCycle(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="1"
                    placeholderTextColor={Corpus.textFaint}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.rowHint}>
                    {Number(cycle) > 1 ? `Your month runs ${cycle}th to ${cycle}th, like your pay day` : 'Day of the month. Set your salary day so budgets match your pay cycle'}
                  </Text>
                </View>
              </View>
            </View>

            {/* HOW YOU EARN */}
            <SectionLabel>SETUP</SectionLabel>
            <View style={styles.group}>
              <Pressable style={styles.row} onPress={() => router.push('/onboarding' as Href)}>
                <View style={styles.rowIcon}>
                  <Ionicons name="compass-outline" size={15} color={Corpus.gold} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>How you earn</Text>
                  <Text style={styles.rowValue}>{earnLabel}</Text>
                </View>
                <Text style={styles.rowHint}>Run setup again</Text>
                <Ionicons name="chevron-forward" size={15} color={Corpus.textFaint} />
              </Pressable>
            </View>

            {/* NOTIFICATIONS — each saves instantly */}
            <SectionLabel>NOTIFICATIONS</SectionLabel>
            <View style={styles.group}>
              {(
                [
                  { k: 'people', icon: 'people-outline', label: 'Money with people', hint: 'Due dates, interest, instalments, “repay Arun”' },
                  { k: 'cards', icon: 'card-outline', label: 'Card bills', hint: '3 days before, the day before, and on the day' },
                  { k: 'budget', icon: 'pie-chart-outline', label: 'Budget warning', hint: 'One evening alert once 80% of your month is used' },
                  { k: 'checkin', icon: 'refresh-outline', label: 'Weekly balance check', hint: 'Sunday 7 PM, only if balances are old' },
                ] as const
              ).map((n, i) => {
                const value = settings.notify?.[n.k] !== false;
                return (
                  <View key={n.k} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={styles.rowIcon}>
                      <Ionicons name={n.icon} size={15} color={Corpus.gold} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowLabel}>{n.label}</Text>
                      <Text style={styles.rowHint}>{n.hint}</Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={(v) => saveSettings({ notify: { ...settings.notify, [n.k]: v } })}
                      trackColor={{ true: Corpus.gold, false: Corpus.cardAlt }}
                      thumbColor={Corpus.text}
                    />
                  </View>
                );
              })}
            </View>
            <Text style={styles.rowHint}>Notifications show on your phone app. On the web, the same reminders appear on Home.</Text>

            {/* PREFERENCES */}
            <SectionLabel>PREFERENCES</SectionLabel>
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
            {(isDirty || saving) && (
              <Button label="Save changes" onPress={handleSave} loading={saving} disabled={!canSave} />
            )}
            {justSaved && <Text style={styles.savedNote}>Saved ✓</Text>}
            {error && <Text style={styles.fieldError}>{error}</Text>}
          </>
        )}

        {/* ACCOUNT */}
        <SectionLabel>ACCOUNT</SectionLabel>
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

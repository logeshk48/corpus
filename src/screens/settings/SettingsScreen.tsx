import { Group, GroupRow, Screen, Segmented, SwitchKnob } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/GlassTabBar';
import { Chip, Corpus, Font, Radius, Space, themeChoice, Type } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { logOut } from '@/services/auth';
import { disableSms, enableSms, shareSupported, smsEnabled, smsSupported } from '@/services/bankSms';
import { saveSettings } from '@/services/settings';
import { setThemeChoice } from '@/services/theme';
import { formatINR, ordinal as dayLabel } from '@/utils/format';
import { WORK_MODES } from '@/utils/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DeleteAccountSheet from './components/DeleteAccountSheet';
import NotificationsSheet, { MODES, NOTIFY, quietLabel } from './components/NotificationsSheet';
import ValueSheet, { type ValueKind } from './components/ValueSheet';

// Settings, the way Android and iOS both advise: a short overview where every row shows its current value,
// tap a row to change just that one thing, switches save the moment you flip them, and rarely used groups
// (all the reminder choices) live one level down.
export default function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading } = useSettings();
  const router = useRouter();
  const [edit, setEdit] = useState<ValueKind | null>(null);
  const [notifs, setNotifs] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [smsOn, setSmsOn] = useState(smsEnabled());

  const name = settings.displayName || user?.email?.split('@')[0] || 'You';
  const earn = WORK_MODES.filter((m) => settings.workModes?.includes(m.id)).map((m) => m.title).join(', ') || 'Not set';
  const cycle = settings.cycleStartDay ?? 1;
  const onCount = NOTIFY.filter((n) => settings.notify?.[n.k] !== false).length;
  const mode = MODES.find((m) => m.value === (settings.notifyMode ?? 'all'))!.label;
  const toggleSms = async () => { if (!smsOn) setSmsOn(await enableSms()); else { disableSms(); setSmsOn(false); } };
  const hide = !!settings.hideAmounts;

  return (
    <Screen title="Settings" contentStyle={{ paddingBottom: TAB_BAR_SPACE + 32 }}>
      <Pressable onPress={() => setEdit('name')} style={({ pressed }) => [s.profile, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${name}. Change your name`}>
        <View style={s.avatar}><Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={s.email} numberOfLines={1}>{user?.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={Corpus.textFaint} />
      </Pressable>

      <Group title="Money">
        <GroupRow icon="wallet" color={Chip.orange} title="Monthly budget" value={loading ? '' : settings.monthlyBudget ? formatINR(settings.monthlyBudget) : 'Not set'} onPress={() => setEdit('budget')} />
        <GroupRow icon="lock-closed" color={Chip.indigo} title="Kept aside" value={loading ? '' : settings.setAside ? formatINR(settings.setAside) : 'None'} onPress={() => setEdit('aside')} />
        <GroupRow icon="calendar" color={Chip.red} title="Month starts on" value={cycle === 1 ? '1st' : `${dayLabel(cycle)}, pay day`} onPress={() => setEdit('cycle')} />
        <GroupRow icon="briefcase" color={Chip.green} title="How you earn" value={earn} onPress={() => router.push('/onboarding' as Href)} />
      </Group>

      {smsSupported ? (
        <Group title="Bank SMS">
          <GroupRow icon="chatbox-ellipses" color={Chip.teal} title="Ask after each payment" subtitle={smsOn ? 'Only bank payment SMS, read on this phone' : 'Off'}
            onPress={toggleSms} chevron={false} right={<SwitchKnob on={smsOn} />} />
          <GroupRow icon="time" color={Chip.gray} title="Waiting bank payments" onPress={() => router.push('/sms-review' as Href)} />
        </Group>
      ) : shareSupported ? (
        <Group title="Bank SMS">
          <GroupRow icon="share" color={Chip.teal} title="Share bank SMS to Corpus" subtitle="Long-press a bank SMS, tap Share, pick Corpus" onPress={() => router.push('/sms-review' as Href)} />
        </Group>
      ) : null}

      <Group title="App">
        <GroupRow icon="notifications" color={Chip.red} title="Notifications" subtitle={`Briefing at ${settings.briefingHour ?? 9} AM, ${settings.quietHours === null ? 'no quiet hours' : `quiet ${quietLabel(settings.quietHours)}`}`} value={(settings.notifyMode ?? 'all') === 'all' ? `${onCount} on` : mode} onPress={() => setNotifs(true)} />
        <View style={s.themeRow}>
          <Text style={s.rowTitle}>Appearance</Text>
          <Segmented options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] as const} value={themeChoice} onChange={setThemeChoice} />
          <Text style={s.hint}>Auto matches your phone's setting</Text>
        </View>
        <GroupRow icon="eye-off" color={Chip.purple} title="Hide amounts in Invest" subtitle={hide ? 'Shows ₹ •••• instead of amounts' : 'Off'}
          onPress={() => saveSettings({ hideAmounts: !hide }).catch(() => {})} chevron={false} right={<SwitchKnob on={hide} />} />
        <GroupRow icon="cash" color={Chip.green} title="Currency" value="Indian rupee (₹)" />
      </Group>

      <Group title="Your data">
        <GroupRow icon="document-text" color={Chip.blue} title="Reports and export" subtitle="Monthly reports and a CSV of every entry" onPress={() => router.push('/reports' as Href)} />
      </Group>

      <Group>
        <GroupRow icon="log-out" color={Chip.gray} title="Sign out" onPress={() => logOut()} chevron={false} />
        <GroupRow icon="trash" color={Chip.red} title="Delete account and data" onPress={() => setShowDelete(true)} chevron={false} />
      </Group>

      <Text style={s.version}>Corpus 1.0</Text>

      {edit && <ValueSheet kind={edit} settings={settings} onClose={() => setEdit(null)} />}
      {notifs && <NotificationsSheet settings={settings} onClose={() => setNotifs(false)} />}
      <DeleteAccountSheet visible={showDelete} onClose={() => setShowDelete(false)} onExport={() => { setShowDelete(false); router.push('/reports' as Href); }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Corpus.card, borderRadius: 22, padding: Space.md, overflow: 'hidden' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Corpus.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Type.title, fontFamily: Font.displayBold, color: Corpus.onGold },
  name: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text },
  email: { fontSize: Type.body, color: Corpus.textMuted },
  themeRow: { padding: Space.md, gap: 10 },
  rowTitle: { fontSize: Type.input, color: Corpus.text },
  hint: { fontSize: Type.small, color: Corpus.textMuted },
  version: { fontSize: Type.small, color: Corpus.textFaint, textAlign: 'center', marginTop: Space.sm, borderRadius: Radius.sm },
});

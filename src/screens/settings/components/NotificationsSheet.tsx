import { Choice, Sheet, Toggle } from '@/components/ui';
import { saveSettings } from '@/services/settings';
import type { Settings } from '@/types/settings';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native';
import { Corpus, Font, Type } from '@/constants/theme';

type Key = keyof NonNullable<Settings['notify']>;
export const NOTIFY: readonly { k: Key; icon: string; label: string; hint: string }[] = [
  { k: 'daily', icon: 'sunny', label: 'Morning briefing', hint: 'What you can spend today and what is due' },
  { k: 'cards', icon: 'card', label: 'Bills, EMIs and card dues', hint: 'The day before and on the day. Cards also 3 days before' },
  { k: 'sips', icon: 'repeat', label: 'SIPs', hint: 'The day before the debit, then a check that it went through' },
  { k: 'people', icon: 'people', label: 'Money with people', hint: 'Due dates, interest and instalments' },
  { k: 'budget', icon: 'pie-chart', label: 'Budget warning', hint: 'Once, in the evening, when 80% of your month is used' },
  { k: 'weekly', icon: 'stats-chart', label: 'Weekly and monthly review', hint: 'Sunday 7 PM, and the 1st at 10 AM' },
  { k: 'checkin', icon: 'refresh-circle', label: 'Balance check', hint: 'Sunday 7 PM when balances are old' },
];
export const MODES = [
  { value: 'all', label: 'Everything' },
  { value: 'digest', label: 'Briefing and weekly' },
  { value: 'urgent', label: 'Only urgent' },
] as const;
const QUIET = [
  { value: 'off', label: 'Off', v: null },
  { value: '22-7', label: '10 PM to 7 AM', v: { from: 22, to: 7 } },
  { value: '22-8', label: '10 PM to 8 AM', v: { from: 22, to: 8 } },
  { value: '23-7', label: '11 PM to 7 AM', v: { from: 23, to: 7 } },
] as const;
type QuietKey = (typeof QUIET)[number]['value'];

export const quietKey = (q: Settings['quietHours']): QuietKey => {
  const cur = q === undefined ? { from: 22, to: 8 } : q;
  return cur ? (QUIET.find((o) => o.v && o.v.from === cur.from && o.v.to === cur.to)?.value ?? '22-8') : 'off';
};
export const quietLabel = (q: Settings['quietHours']) => QUIET.find((o) => o.value === quietKey(q))!.label;

// Everything about reminders on one sheet. Each switch saves the moment you flip it.
export default function NotificationsSheet({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const mode = settings.notifyMode ?? 'all';
  return (
    <Sheet title="Notifications" subtitle="They show on your phone. On the web, the same reminders appear on Today." onClose={onClose}>
      <Choice label="How often" options={MODES} value={mode} onChange={(v) => saveSettings({ notifyMode: v })} />
      <Text style={s.hint}>
        {mode === 'all' ? 'Each reminder arrives on its own, up to 3 a day plus the briefing.' : mode === 'digest' ? 'Only the morning briefing and the Sunday review. Other reminders are listed inside the briefing.' : 'Only things due today or late, plus the briefing.'}
      </Text>
      <Choice label="Briefing at" options={[7, 8, 9, 10].map((h) => ({ value: String(h), label: `${h} AM` }))} value={String(settings.briefingHour ?? 9)} onChange={(v) => saveSettings({ briefingHour: Number(v) })} />
      <Choice label="Quiet hours" options={QUIET} value={quietKey(settings.quietHours)} onChange={(k) => { const o = QUIET.find((x) => x.value === k)!; saveSettings({ quietHours: o.v ? { ...o.v } : null }); }} />
      <Text style={s.hint}>Anything that would arrive at night waits until morning.</Text>
      <Text style={s.head} accessibilityRole="header">Reminders</Text>
      <View style={{ gap: 4 }}>
        {NOTIFY.map((n) => (
          <Toggle key={n.k} icon={n.icon} title={n.label} hint={n.hint} value={settings.notify?.[n.k] !== false} onChange={(v) => saveSettings({ notify: { ...settings.notify, [n.k]: v } })} />
        ))}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  hint: { fontSize: Type.small, color: Corpus.textMuted, marginTop: -6, lineHeight: 18 },
  head: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text, marginTop: 4 },
});

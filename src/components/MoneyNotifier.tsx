import { useIous } from '@/hooks/useIous';
import { moneyReminders, notificationsToSchedule } from '@/utils/debtReminders';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Turns money reminders ("Ask Rahul for ₹500 · Due today") into phone
// notifications at 9 AM. Re-syncs whenever lent/borrowed entries change.
// Phones only: on web the Home card shows the same reminders.

const KIND = 'money-reminder';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export default function MoneyNotifier() {
  const { ious, loading } = useIous();
  const asked = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || loading) return;
    const timer = setTimeout(async () => {
      try {
        if (!asked.current) {
          asked.current = true;
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('money', {
              name: 'Money reminders',
              importance: Notifications.AndroidImportance.DEFAULT,
            });
          }
        }
        const plan = notificationsToSchedule(moneyReminders(ious));
        if (plan.length === 0) {
          await cancelOurs();
          return;
        }
        const perm = await Notifications.getPermissionsAsync();
        if (!perm.granted) {
          const req = await Notifications.requestPermissionsAsync();
          if (!req.granted) return;
        }
        await cancelOurs();
        for (const n of plan.slice(0, 50)) {
          await Notifications.scheduleNotificationAsync({
            identifier: n.id,
            content: { title: n.title, body: n.body, data: { kind: KIND, url: '/ious' } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: 'money' },
          });
        }
      } catch (e) {
        console.warn('Money reminders not scheduled:', e);
      }
    }, 1500); // wait for edits to settle
    return () => clearTimeout(timer);
  }, [ious, loading]);

  return null;
}

async function cancelOurs() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter((n) => n.content.data?.kind === KIND).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

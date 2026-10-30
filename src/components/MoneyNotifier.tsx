import { useIous } from '@/hooks/useIous';
import { useInvestments } from '@/hooks/useInvestments';
import { sipReminders } from '@/utils/sip';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { overallBudget } from '@/utils/budgets';
import { formatINR } from '@/utils/format';
import { useAccounts } from '@/hooks/useAccounts';
import { accountBalances, cardReminders, verifiedAgo } from '@/utils/accounts';
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
  const { accounts } = useAccounts();
  const { settings } = useSettings();
  const { transactions } = useTransactions('month');
  const { investments } = useInvestments();
  const on = (k: 'people' | 'cards' | 'checkin' | 'budget' | 'sips') => settings.notify?.[k] !== false;
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
        const cards = cardReminders(accountBalances(accounts, []));
        const plan = notificationsToSchedule([...(on('people') ? moneyReminders(ious) : []), ...(on('cards') ? cards : [])]);
        // SIPs: the day before (9 AM) and "did it go through?" the day after
        if (on('sips')) for (const r of sipReminders(investments)) if (r.when > new Date()) plan.push({ id: r.id, date: r.when, title: r.title, body: r.body });
        // card bills: also 3 days before
        for (const c of on('cards') ? cards : []) {
          const d = new Date(c.when.getTime() - 3 * 86_400_000);
          if (d > new Date()) plan.push({ id: `${c.id}:3d`, date: d, title: c.title, body: c.body.replace(/^Due in \d+ days/, 'Due in 3 days') });
        }
        // weekly balance check-in: next Sunday 7 PM, only if something is 7+ days old
        if (on('checkin') && accounts.some((a) => verifiedAgo(a).stale || verifiedAgo(a).days >= 6)) {
          const now = new Date();
          const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7), 19);
          if (sun <= now) sun.setDate(sun.getDate() + 7);
          plan.push({ id: 'checkin:weekly', date: sun, title: 'Update your balances', body: 'Open your bank & card apps, 30 seconds keeps your net worth right' });
        }
        if (plan.length === 0) {
          await cancelOurs();
          return;
        }
        // Budget: one evening heads-up once 80% of the month's budget is used
        const ob = overallBudget(transactions, settings.monthlyBudget);
        if (on('budget') && ob && ob.limit > 0 && ob.spent / ob.limit >= 0.8) {
          const now = new Date();
          const eve = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20);
          if (eve > now) {
            const pct = Math.round((ob.spent / ob.limit) * 100);
            plan.push({
              id: `budget:${eve.toISOString().slice(0, 10)}`,
              date: eve,
              title: pct >= 100 ? 'Over this month’s budget' : `${pct}% of this month’s budget used`,
              body: pct >= 100 ? `${formatINR(ob.spent - ob.limit)} over your ${formatINR(ob.limit)} limit` : `${formatINR(ob.limit - ob.spent)} left. Go easy for the rest of the month`,
            });
          }
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
  }, [ious, accounts, loading, settings.notify, settings.monthlyBudget, transactions, investments.map((h) => `${h.id}${h.sip?.day}${h.sip?.active}${h.sipLog?.length}`).join()]);

  return null;
}

async function cancelOurs() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter((n) => n.content.data?.kind === KIND).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

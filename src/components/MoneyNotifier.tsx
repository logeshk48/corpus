import { useIous } from '@/hooks/useIous';
import { useInvestments } from '@/hooks/useInvestments';
import { sipReminders } from '@/utils/sip';
import { useBills } from '@/hooks/useBills';
import { debtPlanReminders, debtPlanSummary } from '@/utils/debtPlan';
import { needsCheckup } from '@/utils/investments';
import { useInbox } from '@/hooks/useInbox';
import { useSafeToday } from '@/hooks/useSafeToday';
import { briefing } from '@/utils/inbox';
import { weekReview, weekSummaryText } from '@/utils/weekReview';
import { finalizePlan } from '@/utils/notifyPlan';
import { CATEGORIES, categoryFor, hrefFor } from '@/utils/notifyMeta';
import { lowBalanceItems, overspentToday } from '@/utils/inbox';
import { upcomingBills } from '@/utils/moneyHealth';
import { useToast } from '@/context/ToastContext';
import { logBillForThisMonth } from '@/services/bills';
import { saveInboxMarks } from '@/services/settings';
import { confirmSip, skipSip } from '@/services/investments';
import { pendingSips } from '@/utils/sip';
import { useRouter, type Href } from 'expo-router';
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
  const { transactions: weekTx } = useTransactions('last12Months');
  const { investments } = useInvestments();
  const { bills } = useBills();
  const inbox = useInbox();
  const safe = useSafeToday();
  const on = (k: 'people' | 'cards' | 'checkin' | 'budget' | 'sips' | 'daily' | 'weekly') => settings.notify?.[k] !== false;
  const asked = useRef(false);
  const router = useRouter();
  const { showToast } = useToast();
  // latest data for notification buttons (they can fire long after scheduling)
  const latest = useRef({ bills, investments, settings });
  latest.current = { bills, investments, settings };

  // Tapping a notification opens the right screen; its buttons do the job right there
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = async (resp: Notifications.NotificationResponse) => {
      const data = (resp.notification.request.content.data ?? {}) as { url?: string; ref?: string; kind?: string };
      if (data.kind !== KIND) return;
      const ref = data.ref ?? '';
      const act = resp.actionIdentifier;
      const L = latest.current;
      try {
        if (act === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          if (data.url) router.push(data.url as Href);
          return;
        }
        if (act === 'paid') {
          const bill = L.bills.find((b) => b.id === ref.split(':')[1]);
          if (bill) {
            await logBillForThisMonth(bill, bill.amount);
            showToast({ message: `${bill.name} ${formatINR(bill.amount)} recorded as paid` });
          }
        } else if (act === 'snooze' || act === 'done') {
          const t = new Date();
          const mark = act === 'done' ? { done: t.toISOString() } : { snooze: new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 9).toISOString() };
          await saveInboxMarks({ ...(L.settings.inbox ?? {}), [ref]: mark });
          showToast({ message: act === 'done' ? 'Marked done' : 'Okay — tomorrow at 9 AM' });
        } else if (act === 'sip-yes' || act === 'sip-skip') {
          const [, hid, month] = ref.split(':');
          const p = pendingSips(L.investments).find((x) => x.h.id === hid && x.month === month);
          if (p) {
            if (act === 'sip-yes') {
              const e = await confirmSip(p.h, p);
              showToast({ message: e.units ? `${p.h.name}: +${e.units} units added` : `${formatINR(p.amount)} added to ${p.h.name}` });
            } else {
              await skipSip(p.h, p);
              showToast({ message: 'SIP marked as skipped' });
            }
          }
        }
      } catch (e) {
        console.warn('Notification action failed', e);
        showToast({ message: 'Couldn’t do that — open Reminders to try again' });
      }
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // opened the app by tapping a notification while it was closed
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r && r.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) handle(r);
      })
      .catch(() => {});
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // buttons on notifications: Paid / Remind tomorrow / Done / SIP yes-skipped
          for (const c of CATEGORIES)
            await Notifications.setNotificationCategoryAsync(c.id, c.actions.map((a) => ({ identifier: a.id, buttonTitle: a.title, options: { opensAppToForeground: true } }))).catch(() => {});
        }
        const cards = cardReminders(accountBalances(accounts, []));
        const plan = notificationsToSchedule([...(on('people') ? moneyReminders(ious) : []), ...(on('cards') ? cards : [])]);
        // Bills & EMIs: the day before and on the day, 9 AM (with a ✓ Paid button)
        if (on('cards'))
          for (const u of upcomingBills(bills, new Date(), 14)) {
            const id = `bill:${u.bill.id}:${u.due.toISOString().slice(0, 10)}`;
            const day = new Date(u.due.getFullYear(), u.due.getMonth(), u.due.getDate(), 9);
            const amt = u.bill.variable ? `about ${formatINR(u.amount)}` : formatINR(u.amount);
            plan.push({ id: `${id}:eve`, date: new Date(day.getTime() - 86_400_000), title: `${u.bill.name} ${amt} due tomorrow`, body: 'Keep it in your bank · tap ✓ Paid when it’s done' });
            plan.push({ id, date: day, title: `${u.bill.name} ${amt} due today`, body: u.bill.variable ? 'Amount changes — open to enter this month’s' : 'Tap ✓ Paid once it’s done' });
          }
        // Low balance: next 10 AM (today if it's still before 10)
        {
          const now = new Date();
          let at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10);
          if (at <= now) at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10);
          for (const l of lowBalanceItems(accountBalances(accounts, transactions), bills)) plan.push({ id: l.id.replace(/:\d{4}-\d{2}-\d{2}$/, `:${at.toISOString().slice(0, 10)}`), date: at, title: l.title, body: l.body });
          // Overspent today: 8 PM
          const over = overspentToday(safe);
          const eight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20);
          if (over && on('budget') && eight > now) plan.push({ id: over.id, date: eight, title: over.title, body: over.body });
        }
        // SIPs: the day before (9 AM) and "did it go through?" the day after
        if (on('sips')) for (const r of sipReminders(investments)) if (r.when > new Date()) plan.push({ id: r.id, date: r.when, title: r.title, body: r.body });
        // Debt plan: pay day, 10 AM — "Put ₹5,000 extra on SBI Card"
        if (on('people')) for (const r of debtPlanReminders(debtPlanSummary({ ious, bills, accounts: accountBalances(accounts, []), plan: settings.debtPlan, cycleStartDay: settings.cycleStartDay }), settings.cycleStartDay)) if (r.when > new Date()) plan.push({ id: r.id, date: r.when, title: r.title, body: r.body });
        // card bills: also 3 days before
        for (const c of on('cards') ? cards : []) {
          const d = new Date(c.when.getTime() - 3 * 86_400_000);
          if (d > new Date()) plan.push({ id: `${c.id}:3d`, date: d, title: c.title, body: c.body.replace(/^Due in \d+ days/, 'Due in 3 days') });
        }
        // Weekly review: Sunday 7 PM — the week's numbers, plus "update balances" if they're old
        {
          const now = new Date();
          const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7), 19);
          if (sun <= now) sun.setDate(sun.getDate() + 7);
          const staleBal = on('checkin') && accounts.some((a) => verifiedAgo(a).stale || verifiedAgo(a).days >= 6);
          if (on('weekly')) {
            const r = weekReview(weekTx, sun);
            plan.push({ id: `week:${sun.toISOString().slice(0, 10)}`, date: sun, title: 'Your week in money', body: weekSummaryText(r) + (staleBal ? ' · update your balances' : '') });
          } else if (staleBal) {
            plan.push({ id: 'checkin:weekly', date: sun, title: 'Update your balances', body: 'Open your bank & card apps, 30 seconds keeps your net worth right' });
          }
        }
        // Monthly report: the 1st at 10 AM
        if (on('weekly')) {
          const now = new Date();
          const first = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10);
          const name = now.toLocaleDateString('en-IN', { month: 'long' });
          plan.push({ id: `month:${first.toISOString().slice(0, 7)}`, date: first, title: `Your ${name} report is ready`, body: 'What you earned, spent and saved — and what changed. Tap to see it.' });
        }
        // Monthly investment check-up: 1st of next month, 10 AM, if any value has no live price
        const manual = investments.filter((h) => !h.units || !(h.symbol || h.schemeCode || h.npsCode || h.coinId)).filter((h) => !['fd', 'epf', 'ppf'].includes(h.type));
        if (on('checkin') && manual.length) {
          const now = new Date();
          const first = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10);
          const due = investments.filter((h) => needsCheckup(h)).length;
          plan.push({ id: `invest:checkup:${first.toISOString().slice(0, 7)}`, date: first, title: 'Monthly investment check-up', body: `${manual.length} investment${manual.length > 1 ? 's' : ''} without a live price${due ? `, ${due} out of date` : ''}. 1 minute to update.` });
        }
        // Morning briefing: the next morning at your briefing hour (today if it's still before then)
        if (on('daily')) {
          const now = new Date();
          const h = settings.briefingHour ?? 9;
          let at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
          if (at <= now) at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h);
          const sameDay = at.getDate() === now.getDate();
          const b = briefing(inbox.items, sameDay && safe ? safe.safeToday : safe ? Math.max(0, safe.tomorrowAllowance) : null, at);
          plan.push({ id: `brief:${at.toISOString().slice(0, 10)}`, date: at, title: b.title, body: b.body });
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
        // respect "done" and "snooze" from the Reminders screen
        const marks = settings.inbox ?? {};
        const final: typeof plan = [];
        for (const n of plan) {
          const m = marks[n.id.replace(/:(eve|3d)$/, '')];
          if (m?.done) continue;
          if (m?.snooze && new Date(m.snooze) > n.date) {
            if (!final.some((x) => x.id === n.id.replace(/:(eve|3d)$/, '') + ':snz')) final.push({ ...n, id: n.id.replace(/:(eve|3d)$/, '') + ':snz', date: new Date(m.snooze) });
            continue;
          }
          final.push(n);
        }
        // quiet hours, how often, no duplicates (max 3 a day besides the briefing)
        const ready = finalizePlan(final, { mode: settings.notifyMode, quiet: settings.quietHours, briefingHour: settings.briefingHour, briefingOn: on('daily') });
        for (const n of ready.slice(0, 50)) {
          await Notifications.scheduleNotificationAsync({
            identifier: n.id,
            content: {
              title: n.title,
              body: n.body,
              data: { kind: KIND, url: hrefFor(n.id), ref: n.id.replace(/:(eve|3d|snz)$/, '') },
              ...(categoryFor(n.id) ? { categoryIdentifier: categoryFor(n.id)! } : {}),
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, channelId: 'money' },
          });
        }
      } catch (e) {
        console.warn('Money reminders not scheduled:', e);
      }
    }, 1500); // wait for edits to settle
    return () => clearTimeout(timer);
  }, [ious, accounts, bills, weekTx.length, safe?.spentToday, settings.inbox, settings.notifyMode, settings.quietHours, settings.briefingHour, inbox.items.length, safe?.safeToday, settings.debtPlan, settings.cycleStartDay, loading, settings.notify, settings.monthlyBudget, transactions, investments.map((h) => `${h.id}${h.sip?.day}${h.sip?.active}${h.sipLog?.length}`).join()]);

  return null;
}

async function cancelOurs() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter((n) => n.content.data?.kind === KIND).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

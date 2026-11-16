import CandleChart from '@/components/charts/CandleChart';
import Spark from '@/components/charts/Spark';
import { Button, Group, IconChip, Screen } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { Chip, Corpus, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useBills } from '@/hooks/useBills';
import { useEntrance } from '@/hooks/useEntrance';
import { useIous } from '@/hooks/useIous';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { addAccount, checkIn, deleteAccount, updateAccount } from '@/services/accounts';
import { saveSettings } from '@/services/settings';
import { accountTypeMeta, type NewAccount } from '@/types/account';
import { accountBalances, accountTotals, nextCardDue, verifiedAgo, type AccountBalance } from '@/utils/accounts';
import { formatINR } from '@/utils/format';
import { cardHealth, moneyHealth } from '@/utils/moneyHealth';
import { bestSwipeDay, detectPayday, idleEarnings, minBalanceRisk, spendBetween, untilPayday } from '@/utils/payday';
import { accountSpark, moneyCandles, type Candle, type CandleRange } from '@/utils/candles';
import { addCheckinTotal, gapMatters, reconcile } from '@/utils/reconcile';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
import AccountSheet from './AccountSheet';
import { styles } from './AccountsScreen.styles';
import UpdateBalancesSheet from './UpdateBalancesSheet';

const STARTERS: NewAccount[] = [
  { name: 'Cash', type: 'cash', opening: 0, openingDate: '' },
  { name: 'Bank account', type: 'bank', opening: 0, openingDate: '' },
];
// Identity colours: each account keeps one colour in the bar, its icon and the balance sheet
const MONEY_COLORS = [Chip.blue, Chip.teal, Chip.indigo, Chip.purple];
const CARD_COLORS = [Chip.pink, Chip.orange, Chip.purple, Chip.indigo];
const OTHER = Chip.gray;
const shortDate = (d: Date | string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function AccountsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { accounts, loading } = useAccounts();
  const { settings } = useSettings();
  const { transactions } = useTransactions('last12Months');
  const { ious } = useIous();
  const { bills } = useBills();
  const [sheet, setSheet] = useState<{ editing?: AccountBalance; type?: 'credit' } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [range, setRange] = useState<CandleRange>('days');
  const [pick, setPick] = useState<number | null>(null);
  const t = useEntrance(700, loading);
  const c = useEntrance(900, `${loading}-${range}`);

  const ct = settings.checkinTotals ?? [];
  const recon = useMemo(() => (ct.length >= 2 ? reconcile(ct[ct.length - 2], ct[ct.length - 1], transactions, ious) : null), [ct, transactions, ious]);
  const list = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions]);
  const totals = accountTotals(list);
  const payday = useMemo(() => detectPayday(transactions), [transactions]);
  const health = useMemo(() => moneyHealth(totals.have, totals.cardDues, bills, transactions), [totals.have, totals.cardDues, bills, transactions]);

  const money = useMemo(() => list.filter((a) => a.type !== 'credit').sort((a, b) => b.balance - a.balance), [list]);
  const cards = useMemo(() => list.filter((a) => a.type === 'credit').sort((a, b) => b.balance - a.balance), [list]);
  const colors = useMemo(() => {
    const c: Record<string, string> = {};
    money.forEach((a, i) => (c[a.id] = MONEY_COLORS[i] ?? OTHER));
    cards.forEach((a, i) => (c[a.id] = CARD_COLORS[i % CARD_COLORS.length]));
    return c;
  }, [money, cards]);
  const stale = list.filter((a) => verifiedAgo(a).stale);

  // ─── actions (unchanged behaviour) ───
  const save = async (a: NewAccount, makeDefault: boolean, newBalance: number) => {
    try {
      const ed = sheet?.editing;
      const id = ed ? (await updateAccount(ed.id, a), ed.id) : await addAccount(a);
      if (ed && newBalance !== ed.balance) await checkIn({ ...ed, ...a }, newBalance);
      if (makeDefault && settings.defaultAccountId !== id) await saveSettings({ defaultAccountId: id });
      if (!makeDefault && settings.defaultAccountId === id) await saveSettings({ defaultAccountId: undefined });
      showToast({ message: ed ? `${a.name} saved` : `${a.name} added` });
      setSheet(null);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Couldn’t save. Check your connection and try again.' });
    }
  };

  const remove = (a: AccountBalance) => {
    const go = async () => {
      try {
        await deleteAccount(a.id);
        if (settings.defaultAccountId === a.id) await saveSettings({ defaultAccountId: undefined });
        setSheet(null);
        showToast({ message: `${a.name} deleted. Its entries stay in your history` });
      } catch (e) {
        console.error(e);
        showToast({ message: 'Couldn’t delete. Try again.' });
      }
    };
    const msg = 'Your expenses and income stay. They just won’t be linked to this account.';
    if (Platform.OS === 'web') window.confirm(`Delete ${a.name}?\n\n${msg}`) && go();
    else Alert.alert(`Delete ${a.name}?`, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  const addStarters = async () => {
    const now = new Date().toISOString();
    await Promise.all(STARTERS.map((s) => addAccount({ ...s, openingDate: now })));
    showToast({ message: 'Cash and Bank added. Tap each to set its balance' });
  };

  const saveAll = async (values: { account: AccountBalance; balance: number }[]) => {
    try {
      await Promise.all(values.map((v) => checkIn(v.account, v.balance)));
      const net = values.reduce((s, v) => s + (v.account.type === 'credit' ? -Math.max(0, v.balance) : v.balance), 0);
      await saveSettings({ checkinTotals: addCheckinTotal(settings.checkinTotals, net) });
      showToast({ message: 'All balances checked' });
      setUpdating(false);
    } catch (e) {
      console.error(e);
      showToast({ message: 'Couldn’t save. Try again.' });
    }
  };

  // ─── pieces ───
  const segments = useMemo(() => {
    const pos = money.filter((a) => a.balance > 0);
    const top = pos.slice(0, 4).map((a) => ({ key: a.id, name: a.name, amount: a.balance, color: colors[a.id] }));
    const rest = pos.slice(4).reduce((s, a) => s + a.balance, 0);
    if (rest > 0) top.push({ key: 'other', name: `${pos.length - 4} more`, amount: rest, color: OTHER });
    const sum = top.reduce((s, x) => s + x.amount, 0);
    return sum > 0 ? top.map((x) => ({ ...x, pct: Math.round((x.amount / sum) * 100) })) : [];
  }, [money, colors]);

  const candles = useMemo(() => moneyCandles(list, transactions, range), [list, transactions, range]);
  const sel = pick !== null && pick < candles.length ? pick : candles.length - 1;
  const cur = candles[sel];
  const first = candles[0];
  const candleLabel = (k: Candle) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (range === 'days') return k.start.getTime() === today.getTime() ? 'Today' : shortDate(k.start);
    return `${shortDate(k.start)} week`;
  };
  const scrubbing = pick !== null && sel !== candles.length - 1;
  const shown = scrubbing && cur ? cur.close : totals.have;
  const change = cur && first ? (scrubbing ? cur.close - cur.open : totals.have - first.open) : 0;
  const base = cur && first ? (scrubbing ? cur.open : first.open) : 0;
  const pct = base > 0 ? Math.abs(change / base) * 100 : 0;
  const up = change >= 0;

  const hero = (
    <View style={styles.summary}>
      <Text style={styles.label}>{scrubbing && cur ? `Closed ${candleLabel(cur) === 'Today' ? 'today' : candleLabel(cur)} at` : 'You have'}</Text>
      <Text
        style={[styles.big, { fontSize: formatINR(shown).length > 10 ? Type.amount : Type.hero }, shown < 0 && { color: Corpus.danger }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`You have ${formatINR(totals.have)} in ${money.length} account${money.length === 1 ? '' : 's'}`}
      >
        {formatINR(Math.round(shown * (scrubbing ? 1 : t)))}
      </Text>
      {candles.length >= 2 && (
        <View style={[styles.change, { backgroundColor: change === 0 ? Corpus.cardAlt : up ? Corpus.incomeTint : Corpus.dangerTint }]}>
          <Ionicons name={change === 0 ? 'remove' : up ? 'trending-up' : 'trending-down'} size={15} color={change === 0 ? Corpus.textMuted : up ? Corpus.income : Corpus.danger} />
          <Text style={[styles.changeText, { color: change === 0 ? Corpus.textMuted : up ? Corpus.income : Corpus.danger }]}>
            {change === 0 ? 'No change' : `${up ? 'Up' : 'Down'} ${formatINR(Math.abs(change))}${pct >= 0.1 ? ` (${pct.toFixed(1)}%)` : ''}`}
            {scrubbing ? (range === 'days' ? ' that day' : ' that week') : range === 'days' ? ' in 2 weeks' : ' in 3 months'}
          </Text>
        </View>
      )}
      {candles.length >= 2 ? (
        <View style={{ marginTop: 14, gap: 12 }}>
          <CandleChart candles={candles} selected={sel} onSelect={setPick} appear={c} label={candleLabel} />
          <View style={styles.ranges} accessibilityRole="tablist">
            {(['days', 'weeks'] as const).map((r) => (
              <Pressable key={r} onPress={() => { setRange(r); setPick(null); }} style={({ pressed }) => [styles.rangePill, range === r && styles.rangeOn, pressed && { opacity: 0.7 }]} accessibilityRole="tab" accessibilityState={{ selected: range === r }}>
                <Text style={[styles.rangeText, range === r && { color: Corpus.onGold }]}>{r === 'days' ? '2 weeks' : '3 months'}</Text>
              </Pressable>
            ))}
            {scrubbing && (
              <Pressable onPress={() => setPick(null)} style={styles.rangePill} accessibilityRole="button" hitSlop={4}>
                <Text style={styles.rangeText}>Back to now</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.swatch, { borderWidth: 1.5, borderColor: Corpus.income }]} />
            <Text style={styles.legendText}>Ended higher</Text>
            <View style={[styles.swatch, { backgroundColor: Corpus.danger }]} />
            <Text style={styles.legendText}>Ended lower</Text>
          </View>
        </View>
      ) : (
        <View style={styles.chartEmpty}>
          <IconChip icon="mci:chart-timeline-variant" color={Chip.indigo} size={30} />
          <Text style={[styles.extraText, { flex: 1 }]}>The chart fills in after a few days of entries.</Text>
        </View>
      )}
    </View>
  );

  const where = segments.length > 1 && (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">Where it sits</Text>
        <Text style={styles.meta}>{segments.length} places</Text>
      </View>
      <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {segments.map((x) => (
          <View key={x.key} style={[styles.seg, { flex: Math.max(x.pct, 2) * t + 0.001, backgroundColor: x.color }]} />
        ))}
      </View>
      {segments.map((x) => (
        <View key={x.key} style={styles.legendRow} accessible accessibilityLabel={`${x.name}: ${formatINR(x.amount)}, ${x.pct} percent`}>
          <View style={[styles.dot, { backgroundColor: x.color }]} />
          <Text style={styles.legendName} numberOfLines={1}>{x.name}</Text>
          <Text style={styles.legendAmt}>{formatINR(x.amount)}</Text>
          <Text style={styles.legendPct}>{x.pct}%</Text>
        </View>
      ))}
    </View>
  );

  const tiles = (
    <View style={styles.strip}>
      <Pressable
        style={({ pressed }) => [styles.stat, pressed && { opacity: 0.7 }]}
        onPress={() => (cards.length ? setSheet({ editing: cards[0] }) : setSheet({ type: 'credit' }))}
        accessibilityRole="button"
      >
        <Text style={styles.statLabel}>Card dues</Text>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{cards.length ? formatINR(totals.cardDues) : 'None'}</Text>
        <Text style={styles.statSub} numberOfLines={2}>
          {!cards.length ? 'Add a credit card' : totals.cardDues > 0 ? `${formatINR(totals.net)} left after paying` : 'Nothing owed'}
        </Text>
      </Pressable>
      <View style={styles.stripRule} />
      <View style={styles.stat} accessible>
        <Text style={styles.statLabel}>Lasts</Text>
        <Text style={[styles.statValue, health.runwayDays !== null && health.runwayDays < 15 && { color: Corpus.warning }]} numberOfLines={1} adjustsFontSizeToFit>
          {health.runwayDays !== null ? `${health.runwayDays} days` : '–'}
        </Text>
        <Text style={styles.statSub} numberOfLines={2}>
          {health.runwayDays !== null ? `at ${formatINR(health.perDay)} a day` : 'Needs a week of entries'}
        </Text>
      </View>
    </View>
  );

  const u = payday ? untilPayday(health.free, health.perDay, payday) : null;
  const next30 = (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">Next 30 days</Text>
        <View style={[styles.pill, { backgroundColor: health.short ? Corpus.dangerTint : Corpus.incomeTint }]}>
          <Ionicons name={health.short ? 'alert-circle' : 'checkmark-circle'} size={14} color={health.short ? Corpus.danger : Corpus.income} />
          <Text style={[styles.pillText, { color: health.short ? Corpus.danger : Corpus.income }]}>{health.short ? 'Short' : 'Covered'}</Text>
        </View>
      </View>
      <Line name="You have" amount={formatINR(health.have)} />
      {!!health.billsDue && <Line name="Bills due" amount={`− ${formatINR(health.billsDue)}`} />}
      {!!health.cardDues && <Line name="Card dues" amount={`− ${formatINR(health.cardDues)}`} />}
      <View style={styles.rule} />
      <View style={styles.line}>
        <Text style={styles.totalName}>{health.short ? 'Short by' : 'Free to spend'}</Text>
        <Text style={[styles.totalAmt, health.short && { color: Corpus.danger }]}>{formatINR(Math.abs(health.free))}</Text>
      </View>
      {u && payday && (
        <Tip icon="calendar" color={u.fits ? Chip.green : Chip.orange}>
          Pay day around <Text style={styles.strong}>{shortDate(payday.next)}</Text> ({payday.daysLeft} day{payday.daysLeft > 1 ? 's' : ''}). You can spend{' '}
          <Text style={styles.strong}>{formatINR(u.allowance)} a day</Text>.{' '}
          {u.fits ? 'Your usual spending fits.' : `At your usual pace you’d need ${formatINR(u.gap)} more.`}
        </Tip>
      )}
      {health.idle > 0 && (
        <Tip icon="bulb" color={Chip.yellow}>
          <Text style={styles.strong}>{formatINR(health.idle)}</Text> is beyond a 3-month safety buffer. In an FD it could earn about{' '}
          <Text style={styles.strong}>{formatINR(idleEarnings(health.idle))} more a year</Text> than in savings (estimate).
        </Tip>
      )}
    </View>
  );

  const nudge = stale.length > 0 && (
    <Pressable onPress={() => setUpdating(true)} style={({ pressed }) => [styles.nudge, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityHint="Opens the balance check-in">
      <Ionicons name="time" size={20} color={Corpus.warning} />
      <Text style={styles.nudgeTitle}>
        {stale.length === list.length ? 'Balances are over a week old' : `${stale.length} balance${stale.length > 1 ? 's are' : ' is'} over a week old`}
      </Text>
      <Text style={styles.nudgeAction}>Update</Text>
    </Pressable>
  );

  const trend = ct.length >= 2 && (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} accessibilityRole="header">After each check-in</Text>
        <Text style={styles.meta}>{formatINR(ct[ct.length - 1].net)} now</Text>
      </View>
      <View style={styles.trend} accessibilityLabel={`Net money at your last ${Math.min(12, ct.length)} check-ins`}>
        {ct.slice(-12).map((c, k, arr) => {
          const max = Math.max(...arr.map((x) => Math.abs(x.net)), 1);
          const last = k === arr.length - 1;
          return (
            <View key={c.date} style={styles.trendCol}>
              <View style={[styles.trendBar, { height: Math.max(4, (Math.abs(c.net) / max) * 52 * t), backgroundColor: c.net < 0 ? Corpus.danger : last ? Corpus.gold : Corpus.border }]} />
              <Text style={[styles.trendLabel, last && { color: Corpus.text }]}>{new Date(c.date).getDate()}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const row = (a: AccountBalance) => {
    const credit = a.type === 'credit';
    const v = verifiedAgo(a);
    const used = credit && a.creditLimit ? Math.min(100, Math.round((Math.max(0, a.balance) / a.creditLimit) * 100)) : 0;
    const amountColor = credit ? Corpus.text : a.balance < 0 ? Corpus.danger : Corpus.text;
    const due = credit ? nextCardDue(a) : null;
    const m = minBalanceRisk(a);
    const swipe = credit ? bestSwipeDay(a) : null;
    const extras: ReactNode[] = [];
    if (credit && a.creditLimit) {
      extras.push(
        <View key="lim" style={{ gap: 5 }}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${used}%`, backgroundColor: used > 30 ? Corpus.warning : Corpus.income }]} />
          </View>
          <Text style={styles.extraText}>
            {used}% of {formatINR(a.creditLimit)} limit used{used > 30 ? '. Under 30% helps your credit score' : ''}
          </Text>
        </View>
      );
    }
    if (due) extras.push(<Extra key="due" icon="calendar-outline" color={due.daysLeft <= 3 ? Corpus.warning : undefined}>Pay by {shortDate(due.due)}{due.daysLeft <= 3 ? `, ${due.daysLeft === 0 ? 'today' : `in ${due.daysLeft} day${due.daysLeft > 1 ? 's' : ''}`}` : ''}</Extra>);
    if (credit && a.balance > 0) extras.push(<Extra key="full" icon="information-circle-outline">Pay the full amount. Paying only the minimum costs about {formatINR(cardHealth(a.balance, a.creditLimit).monthlyInterestIfUnpaid)} a month (~42% a year).</Extra>);
    if (swipe) extras.push(<Extra key="swipe" icon="sparkles-outline">Big buys on the {swipe.best}th get up to {swipe.maxFreeDays} days interest-free.</Extra>);
    if (m && (m.below || m.close)) {
      extras.push(
        <Extra key="min" icon="warning-outline" color={m.below ? Corpus.danger : Corpus.warning}>
          {m.below ? `${formatINR(-m.room)} below the ${formatINR(a.minBalance!)} minimum. Banks charge a penalty for this.` : `Only ${formatINR(m.room)} above the ${formatINR(a.minBalance!)} minimum.`}
        </Extra>
      );
    }
    return (
      <Pressable
        key={a.id}
        onPress={() => setSheet({ editing: a })}
        style={({ pressed }) => pressed && { backgroundColor: Corpus.cardAlt }}
        accessibilityRole="button"
        accessibilityHint="Edit this account"
      >
        <View style={styles.row}>
          <IconChip icon={accountTypeMeta(a.type).chip} color={colors[a.id]} size={36} />
          <View style={styles.rowBody}>
            <View style={styles.nameLine}>
              <Text style={styles.name} numberOfLines={1}>{a.name}</Text>
              {settings.defaultAccountId === a.id && (
                <View style={styles.badge}><Text style={styles.badgeText}>Default</Text></View>
              )}
            </View>
            {v.stale ? (
              <View style={styles.metaWarn}>
                <Ionicons name="time" size={12} color={Corpus.warning} />
                <Text style={[styles.meta, { color: Corpus.warning }]}>{v.days} days old</Text>
              </View>
            ) : (
              <Text style={styles.meta}>{v.label.replace('verified', 'Checked')}</Text>
            )}
          </View>
          <Spark values={accountSpark(a, transactions)} color={colors[a.id]} width={40} />
          <View>
            <Text style={[styles.amount, { color: amountColor }]}>{formatINR(Math.abs(a.balance))}</Text>
            <Text style={styles.amountSub}>{credit ? (a.balance > 0 ? 'you owe' : 'nothing owed') : a.balance < 0 ? 'overdrawn' : 'balance'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Corpus.textFaint} />
        </View>
        {extras.length > 0 && <View style={styles.extras}>{extras}</View>}
      </Pressable>
    );
  };

  const reconCard = recon && (
    <View style={styles.card}>
      <View style={styles.tip}>
        <IconChip icon={gapMatters(recon) ? 'search' : 'checkmark'} color={gapMatters(recon) ? (recon.gap < 0 ? Chip.orange : Chip.blue) : Chip.green} size={30} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.cardTitle}>
            {gapMatters(recon) ? (recon.gap < 0 ? `${formatINR(-recon.gap)} of spending isn’t logged` : `${formatINR(recon.gap)} more than expected`) : 'Everything adds up'}
          </Text>
          <Text style={styles.extraText}>
            Since {shortDate(recon.from)} your money {recon.actualChange >= 0 ? 'went up' : 'went down'} {formatINR(Math.abs(recon.actualChange))}. You logged {formatINR(recon.loggedSpend)} spent
            {recon.loggedIncome ? `, ${formatINR(recon.loggedIncome)} earned` : ''}
            {recon.peopleFlow ? `, ${formatINR(Math.abs(recon.peopleFlow))} ${recon.peopleFlow < 0 ? 'lent or repaid' : 'from people'}` : ''}.
            {gapMatters(recon) && recon.gap > 0 ? ' Maybe income or a refund you didn’t add?' : ''}
          </Text>
          {spendBetween(transactions, recon.from, recon.to).length > 0 && (
            <Text style={styles.extraText}>
              Where it went: {spendBetween(transactions, recon.from, recon.to).map((x) => `${findCategory('expense', x.category)?.label ?? x.category} ${formatINR(x.amount)}`).join(', ')}
            </Text>
          )}
        </View>
      </View>
      {gapMatters(recon) && recon.gap < 0 && (
        <Button size="sm" icon="add" label={`Log ${formatINR(-recon.gap)} now`} onPress={() => router.push(`/add?amount=${-recon.gap}&note=${encodeURIComponent('Unlogged spending')}` as Href)} style={{ alignSelf: 'flex-start', marginLeft: 42 }} />
      )}
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <IconChip icon="mci:bank" color={Chip.blue} size={44} />
      <Text style={styles.emptyTitle}>Where’s your money?</Text>
      <Text style={styles.emptyText}>Add cash, bank, wallet and cards. Pick one when you log a spend and its balance moves with it.</Text>
      <Button label="Start with Cash + Bank" icon="flash" onPress={addStarters} style={{ alignSelf: 'stretch', marginTop: 6 }} />
      <Button variant="secondary" label="Add one myself" onPress={() => setSheet({})} style={{ alignSelf: 'stretch' }} />
    </View>
  );

  const skeleton = (
    <View accessibilityLabel="Loading accounts" accessibilityState={{ busy: true }} style={{ gap: 14 }}>
      <View style={[styles.skel, { height: 150, padding: 18, gap: 12 }]}>
        <View style={[styles.skelLine, { width: 80, height: 12 }]} />
        <View style={[styles.skelLine, { width: 180, height: 34 }]} />
        <View style={[styles.skelLine, { height: 14 }]} />
      </View>
      <View style={[styles.skel, { height: 96 }]} />
      <View style={[styles.skel, { height: 200 }]} />
    </View>
  );

  return (
    <>
      <Screen
        title="Accounts"
        subtitle={list.length ? `${formatINR(totals.net)} after card dues` : undefined}
        right={<Button size="sm" icon="add" label="Add" onPress={() => setSheet({})} />}
      >
        {loading ? skeleton : list.length === 0 ? empty : (
          <>
            {hero}
            {tiles}
            {where}
            {nudge}
            {next30}
            {money.length > 0 && <Group title="Cash & bank">{money.map(row)}</Group>}
            {cards.length > 0 && <Group title="Credit cards">{cards.map(row)}</Group>}
            {stale.length === 0 && <Button variant="secondary" icon="refresh" label="Update balances" onPress={() => setUpdating(true)} />}
            {trend}
            {reconCard}
            <Text style={styles.footnote}>Check your bank and card apps once a week and update here.</Text>
          </>
        )}
      </Screen>

      {updating && <UpdateBalancesSheet list={[...money, ...cards]} colors={colors} onClose={() => setUpdating(false)} onSave={saveAll} />}
      {sheet && (
        <AccountSheet
          key={sheet.editing?.id ?? sheet.type ?? 'new'}
          editing={sheet.editing}
          initialType={sheet.type}
          isDefault={!!sheet.editing && settings.defaultAccountId === sheet.editing.id}
          onClose={() => setSheet(null)}
          onSave={save}
          onDelete={sheet.editing ? () => remove(sheet.editing!) : undefined}
        />
      )}
    </>
  );
}

function Line({ name, amount }: { name: string; amount: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineName}>{name}</Text>
      <Text style={styles.lineAmt}>{amount}</Text>
    </View>
  );
}

function Tip({ icon, color, children }: { icon: string; color: string; children: ReactNode }) {
  return (
    <View style={styles.tip}>
      <IconChip icon={icon} color={color} size={30} />
      <Text style={styles.tipText}>{children}</Text>
    </View>
  );
}

function Extra({ icon, color, children }: { icon: string; color?: string; children: ReactNode }) {
  return (
    <View style={styles.extra}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={color ?? Corpus.textMuted} style={{ marginTop: 1 }} />
      <Text style={[styles.extraText, color ? { color } : null]}>{children}</Text>
    </View>
  );
}

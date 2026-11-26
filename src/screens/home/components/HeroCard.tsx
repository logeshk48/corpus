import Jarvy, { type JarvyMood } from '@/components/fx/Jarvy';
import Shine from '@/components/fx/Shine';
import { Tap } from '@/components/ui';
import RadialRings from '@/components/charts/RadialRings';
import { useEntrance } from '@/hooks/useEntrance';
import { useTween } from '@/hooks/useTween';
import { Chip, Corpus, Font, Type } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import type { SafeToSpendResult } from '@/utils/safeToSpend';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { styles } from './HeroCard.styles';

const STATUS_COLOR = {
  ok: Corpus.gold,
  tight: Corpus.warning,
  over: Corpus.danger,
};

// Two rings of light: outer = this month's money used, inner = how far through the month you are.
// A soft halo in the status colour breathes behind them.
function Rings({ used, through, tone = 'ok', size = 92, children }: { used: number; through: number; tone?: 'ok' | 'tight' | 'over'; size?: number; children?: React.ReactNode }) {
  const money = tone === 'over' ? Corpus.danger : tone === 'tight' ? Corpus.warning : Corpus.income;
  const moneyTrack = tone === 'over' ? Corpus.dangerTint : tone === 'tight' ? Corpus.warningTint : Corpus.incomeTint;
  const reduce = useReducedMotion();
  const b = useSharedValue(0);
  useEffect(() => { if (!reduce && size > 120) b.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true); }, [reduce, size, b]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.06 + b.value * 0.1, transform: [{ scale: 0.97 + b.value * 0.05 }] }));
  const stroke = Math.round(size / 13);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${Math.round(used * 100)}% of this month's money used, ${Math.round(through * 100)}% of the month gone`}>
      {size > 120 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size + 8, height: size + 8, borderRadius: size, borderWidth: stroke * 1.6, borderColor: money }, halo]} />}
      <View style={{ position: 'absolute' }}>
        <RadialRings size={size} stroke={stroke} gap={Math.round(stroke / 2.5)} data={[
          { id: 'money', value: 1, frac: Math.max(0.001, used), color: money, track: moneyTrack },
          { id: 'month', value: 1, frac: Math.max(0.001, through), color: Chip.blue },
        ]} />
      </View>
      {children}
    </View>
  );
}


// The dial: one tick per day of your money month around the rings (past days dim, today bright, days ahead
// faint) and a dot on the money ring where you would be if you spent evenly. Ring behind the dot = ahead.
function Dial({ days, today, through, used, tone, t, children }: { days: number; today: number; through: number; used: number; tone: 'ok' | 'tight' | 'over'; t: number; children: React.ReactNode }) {
  const D = 232, R = 196, c = D / 2;
  const stroke = Math.round(R / 13);
  const rMoney = R / 2 - stroke / 2 - 4;
  const ticks = Array.from({ length: days }, (_, i) => {
    const a = ((i + 0.5) / days) * Math.PI * 2 - Math.PI / 2;
    const now = i === today - 1 && t > 0.95;
    const lit = i < Math.floor(t * (today - 1)) ; // past days light up one by one as the rings sweep in
    const r1 = now ? 103 : 107, r2 = now ? 115 : 112;
    return { k: i, x1: c + Math.cos(a) * r1, y1: c + Math.sin(a) * r1, x2: c + Math.cos(a) * r2, y2: c + Math.sin(a) * r2, now, past: lit };
  });
  const pa = through * Math.PI * 2 - Math.PI / 2;
  return (
    <View style={{ width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={D} height={D} style={{ position: 'absolute' }} aria-hidden>
        {ticks.map((k) => (
          <Line key={k.k} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke={k.now ? Corpus.text : k.past ? Corpus.textFaint : Corpus.border} strokeWidth={k.now ? 3 : 2} strokeLinecap="round" />
        ))}
      </Svg>
      <Rings used={used} through={through * t} tone={tone} size={R}>{children}</Rings>
      {t > 0.95 && (
        <Animated.View entering={FadeIn.delay(200).duration(300)} pointerEvents="none" style={{ position: 'absolute', left: c + Math.cos(pa) * rMoney - 7, top: c + Math.sin(pa) * rMoney - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: Corpus.text, borderWidth: 3, borderColor: Corpus.card }} />
      )}
    </View>
  );
}

// The amount sits beside the rings, so a long range ("₹1,230–1,510") gets a smaller size instead of being cut off
const amountSize = (a: string) => (a.length <= 7 ? Type.entry : a.length <= 9 ? Type.amount : Type.h1);

const PILL = {
  ok: { text: 'On track', bg: Corpus.incomeTint, fg: Corpus.income },
  tight: { text: 'Go easy', bg: Corpus.warningTint, fg: Corpus.warning },
  over: { text: 'Over today', bg: Corpus.dangerTint, fg: Corpus.danger },
};

type HeroCardProps = {
  result: SafeToSpendResult;
  loading?: boolean;
  onPress: () => void;
};

export default function HeroCard({ result, loading, onPress }: HeroCardProps) {
  const t = useEntrance(900, loading ? 0 : 1);
  // Counts up on arrival, then rolls from old to new whenever it changes (e.g. right after you log a spend)
  const safeV = useTween(loading || result.status === 'noData' ? 0 : result.safeToday);
  if (loading) {
    return (
      <View style={[styles.card, styles.cardCol]} accessibilityLabel="Working out what you can spend today" accessibilityState={{ busy: true }}>
        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.label}>Safe to spend today</Text>
            <View style={styles.skeleton} />
            <View style={[styles.skeleton, styles.skeletonSm]} />
          </View>
          <Rings used={0} through={0} />
        </View>
      </View>
    );
  }

  if (result.status === 'noData') {
    return (
      <Tap onPress={onPress} scaleTo={0.985} accessibilityRole="button" style={[styles.card, styles.cardCol]}>
        <View style={styles.top}>
          <View style={styles.left}>
            <Text style={styles.label}>Safe to spend today</Text>
            <Text style={[styles.amount, { color: Corpus.textFaint }]}>₹ —</Text>
          </View>
          <Rings used={0} through={(t * new Date().getDate()) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} />
        </View>
        <Text style={styles.emptyText}>
          Add this month's income (or set a monthly budget in Settings) and Corpus will tell you
          exactly how much you can spend each day.
        </Text>
        <View style={styles.how}>
          <Text style={styles.howText}>How does it work?</Text>
          <Ionicons name="chevron-forward" size={13} color={Corpus.gold} />
        </View>
      </Tap>
    );
  }

  const color = STATUS_COLOR[result.status];
  const over = result.safeToday < 0;
  // A single precise figure reads as a spending target, so show a comfortable range
  const low = Math.max(0, Math.floor((safeV * 0.9) / 10) * 10);
  const high = Math.ceil((safeV * 1.1) / 10) * 10;
  const asRange = !over && result.safeToday >= 50;
  const label = over ? "Over today's limit by" : asRange ? 'Today you can spend about' : 'Safe to spend today';
  const amount = asRange ? `${formatINR(low)}–${formatINR(high).replace('₹', '')}` : formatINR(Math.round(Math.abs(safeV)));

  let context = `${formatINR(result.dailyAllowance)} a day for the next ${result.daysLeft} day${result.daysLeft === 1 ? '' : 's'}`;
  if (result.available < 0) context = `You've used ${formatINR(-result.available)} more than this month allows`;
  else if (result.status === 'tight') context = `Most of today's ${formatINR(result.dailyAllowance)} is used. Go easy`;
  else if (over) context = `From tomorrow it's ${formatINR(result.tomorrowAllowance)} a day`;

  const used = result.income + (result.monthlyBudget ?? 0) > 0 ? Math.min(1, Math.max(0, 1 - Math.max(result.available, 0) / Math.max(1, result.available + result.spent))) : 0;
  const through = Math.min(1, Math.max(0, (result.cycleDays - result.daysLeft + 1) / Math.max(1, result.cycleDays)));

  // How far ahead of an even month you are: money left now against what would be left if every day cost the same
  const total = Math.max(1, result.available + result.spent);
  const evenLeft = (total * result.daysLeft) / Math.max(1, result.cycleDays);
  const ahead = Math.round(result.available - evenLeft);
  const day = result.cycleDays - result.daysLeft + 1;
  const mood: JarvyMood = result.status === 'over' ? 'worried' : result.status === 'tight' ? 'look' : ahead > total * 0.08 ? 'happy' : 'calm';
  const chip = result.status === 'ok'
    ? (ahead >= 50 ? `On track, ${formatINR(ahead)} ahead` : 'On track')
    : result.status === 'tight' ? (ahead < 0 ? `Go easy, ${formatINR(-ahead)} behind` : 'Go easy') : 'Over today';
  const third = result.billsDue > 0 ? { label: 'Kept for bills', value: formatINR(result.billsDue) }
    : result.plansDue > 0 ? { label: 'Kept for jars', value: formatINR(result.plansDue) }
    : { label: 'Spent today', value: formatINR(result.spentToday) };

  // inside the rings there is room for about 9 characters at the big size
  const inner = amount.length <= 7 ? Type.amount : amount.length <= 10 ? Type.h2 : Type.title;
  return (
    <Tap onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${chip}. ${over ? 'Over today by' : 'You can spend'} ${amount} today. ${context}`} style={[styles.card, styles.cardCol]}>
      <Shine />
      <View style={styles.headRow}>
        <View style={[styles.pill, { backgroundColor: PILL[result.status].bg }]}>
          <View style={[styles.liveDot, { backgroundColor: PILL[result.status].fg }]} />
          <Text style={[styles.pillText, { color: PILL[result.status].fg }]}>{chip}</Text>
        </View>
        <Jarvy mood={mood} level={1 - used} color={result.status === 'over' ? Corpus.danger : result.status === 'tight' ? Corpus.warning : Corpus.income} size={34} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <Dial days={result.cycleDays} today={day} through={through} used={used * t} tone={result.status} t={t}>
          <View style={styles.center}>
            <Text style={styles.centerLabel}>{over ? 'Over today by' : 'Today'}</Text>
            <Text style={[styles.amount, { color: over ? Corpus.danger : Corpus.text, fontSize: inner, textAlign: 'center' }]} numberOfLines={1}>{amount}</Text>
            {!over && <Text style={styles.soft}>to spend</Text>}
          </View>
        </Dial>
      </View>

      <Text style={[styles.context, { textAlign: 'center' }]}>
        {result.status === 'ok' && ahead >= 50
          ? <>You're <Text style={{ color: Corpus.income, fontFamily: Font.display }}>{formatINR(ahead)} ahead</Text> of an even month.</>
          : <Text style={{ color: result.status === 'ok' ? Corpus.textMuted : color }}>{context}</Text>}
      </Text>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statLabel}>Left this month</Text><Text style={styles.statValue}>{formatINR(Math.max(0, Math.round(result.available)))}</Text></View>
        <View style={[styles.stat, styles.statRule]}><Text style={styles.statLabel}>A day from here</Text><Text style={styles.statValue}>{formatINR(result.dailyAllowance)}</Text></View>
        <View style={[styles.stat, styles.statRule]}><Text style={styles.statLabel}>{third.label}</Text><Text style={styles.statValue}>{third.value}</Text></View>
      </View>

      {(result.limitedByBudget || result.plansPaused.length > 0) && (
        <Text style={styles.note}>
          {[
            result.limitedByBudget ? 'Capped by your monthly budget' : '',
            result.plansPaused.length === 1 ? `${result.plansPaused[0].name} plan paused this month` : result.plansPaused.length > 1 ? `${result.plansPaused.length} jar plans paused this month` : '',
          ].filter(Boolean).join('. ')}
        </Text>
      )}

      <View style={styles.legend}>
        <View style={[styles.key, { backgroundColor: result.status === 'over' ? Corpus.danger : result.status === 'tight' ? Corpus.warning : Corpus.income }]} /><Text style={styles.legendText}>Used {Math.round(used * 100)}%</Text>
        <View style={[styles.key, styles.keyDot]} /><Text style={styles.legendText}>Even pace</Text>
        <View style={[styles.key, { backgroundColor: Chip.blue }]} /><Text style={styles.legendText}>Day {day} of {result.cycleDays}</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="information-circle-outline" size={16} color={Corpus.textMuted} />
      </View>
    </Tap>
  );
}

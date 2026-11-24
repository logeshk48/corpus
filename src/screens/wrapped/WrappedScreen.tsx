import RadialRings from '@/components/charts/RadialRings';
import Aura from '@/components/fx/Aura';
import { celebrate } from '@/components/fx/Celebrate';
import { CategoryChip, Chip, Corpus, Font, isDark, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useAssets } from '@/hooks/useAssets';
import { useInvestments } from '@/hooks/useInvestments';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useTween } from '@/hooks/useTween';
import { formatINR } from '@/utils/format';
import { lastMonthKey } from '@/utils/monthReport';
import { wrapped, wrappedShareText, type Wrapped } from '@/utils/wrapped';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const STORY_BG = isDark ? Corpus.bg : Corpus.text; // always a dark stage
const FG = Corpus.sheen;
const MS = 5200;

type Card = { key: string; accent: string; second?: string; body: (w: Wrapped) => ReactNode };

// A number that counts up when its card opens
function Count({ to, prefix = '', suffix = '', style }: { to: number; prefix?: string; suffix?: string; style?: object }) {
  const v = useTween(to, 1100);
  return <Text style={[s.huge, style]}>{prefix}{prefix === '₹' ? formatINR(Math.round(v)).replace('₹', '') : Math.round(v)}{suffix}</Text>;
}
const T = ({ d = 0, children, style }: { d?: number; children: ReactNode; style?: object }) => (
  <Animated.Text entering={FadeInDown.delay(d).duration(420)} style={[s.text, style]}>{children}</Animated.Text>
);

function cards(w: Wrapped): Card[] {
  const list: Card[] = [
    { key: 'intro', accent: Chip.indigo, second: Chip.teal, body: () => (
      <>
        <T style={s.kicker}>Corpus Wrapped</T>
        <T d={120} style={s.title}>Your {w.name}</T>
        <T d={260} style={s.sub}>{w.entries} entries, {w.loggedDays} days logged. Here is how it went.</T>
      </>
    ) },
    { key: 'spent', accent: Chip.orange, second: Chip.pink, body: () => (
      <>
        <T style={s.kicker}>You spent</T>
        <Count to={w.spent} prefix="₹" />
        {w.spentChange != null && <T d={300} style={[s.sub, { color: w.spentChange > 0 ? Chip.red : Chip.green }]}>{Math.abs(w.spentChange) > 2 ? formatINR(Math.round(Math.abs(w.spent - w.prevSpent))) : `${Math.abs(Math.round(w.spentChange * 100))}%`} {w.spentChange > 0 ? 'more' : 'less'} than the month before</T>}
        {w.budget ? <T d={420} style={s.sub}>{w.overBudget! > 0 ? `${formatINR(w.overBudget!)} over your budget` : `Inside your ${formatINR(w.budget)} budget`}</T> : null}
      </>
    ) },
  ];
  const top = w.top;
  if (top) list.push({ key: 'top', accent: CategoryChip[top.label.toLowerCase()] ?? Chip.purple, second: Chip.indigo, body: () => (
    <>
      <T style={s.kicker}>Most of it went to</T>
      <Animated.View entering={ZoomIn.delay(150).springify().damping(12)} style={{ alignItems: 'center', marginVertical: 12 }}>
        <RadialRings size={190} stroke={16} data={[{ id: 'top', value: 1, frac: Math.max(0.03, w.topShare), color: Chip.orange, track: FG + '22' }]}>
          <Ionicons name={w.topIcon as keyof typeof Ionicons.glyphMap} size={64} color={FG} />
        </RadialRings>
      </Animated.View>
      <T d={300} style={s.title}>{top.label}</T>
      <T d={420} style={s.sub}>{Math.round(w.topShare * 100)}% of everything, {formatINR(top.amount)}</T>
    </>
  ) });
  if (w.biggestDay) list.push({ key: 'day', accent: Chip.pink, second: Chip.red, body: () => (
    <>
      <T style={s.kicker}>Your biggest day</T>
      <T d={120} style={s.title}>{w.biggestDay!.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</T>
      <Count to={w.biggestDay!.amount} prefix="₹" style={{ fontSize: Type.entry }} />
      <T d={380} style={s.sub}>Mostly {w.biggestDay!.top.toLowerCase()}</T>
    </>
  ) });
  if (w.favourite) list.push({ key: 'fav', accent: Chip.teal, second: Chip.blue, body: () => (
    <>
      <T style={s.kicker}>Your regular</T>
      <T d={120} style={s.title}>{w.favourite!.label}</T>
      <Count to={w.favourite!.count} suffix=" times" style={{ fontSize: Type.entry }} />
      <T d={380} style={s.sub}>{formatINR(w.favourite!.total)} in all</T>
    </>
  ) });
  list.push({ key: 'days', accent: Chip.green, second: Chip.teal, body: () => (
    <>
      <T style={s.kicker}>No-spend days</T>
      <Count to={w.noSpendDays.length} />
      <Animated.View entering={FadeIn.delay(250).duration(400)} style={s.cal}>
        {Array.from({ length: w.daysIn }, (_, i) => {
          const d = i + 1;
          const free = w.noSpendDays.includes(d);
          return (
            <Animated.View key={d} entering={ZoomIn.delay(250 + i * 18).duration(200)}
              style={[s.calDay, free ? { backgroundColor: Chip.green, shadowColor: Chip.green, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : w.spendDays.has(d) ? { backgroundColor: FG + '30' } : { borderWidth: 1, borderColor: FG + '30' }]} />
          );
        })}
      </Animated.View>
      <T d={500} style={s.sub}>{w.noSpendDays.length ? 'Green days, you spent nothing at all.' : 'You spent something every day.'}</T>
    </>
  ) });
  if (w.small.count >= 5) list.push({ key: 'small', accent: Chip.yellow, second: Chip.orange, body: () => (
    <>
      <T style={s.kicker}>Little things</T>
      <Count to={w.small.count} suffix=" spends" style={{ fontSize: Type.entry }} />
      <T d={250} style={s.sub}>under ₹200 each, adding up to {formatINR(w.small.total)}</T>
    </>
  ) });
  if (w.rate != null) list.push({ key: 'kept', accent: Chip.teal, second: Chip.green, body: () => (
    <>
      <T style={s.kicker}>You kept</T>
      <Animated.View entering={ZoomIn.delay(120).springify().damping(12)} style={{ alignItems: 'center', marginVertical: 8 }}>
        <RadialRings size={200} stroke={18} data={[{ id: 'k', value: 1, frac: Math.max(0.02, Math.min(1, w.rate ?? 0)), color: (w.rate ?? 0) < 0 ? Chip.red : Chip.green, track: FG + '22' }]}>
          <Count to={Math.round((w.rate ?? 0) * 100)} suffix="%" style={{ fontSize: Type.entry }} />
        </RadialRings>
      </Animated.View>
      <T d={300} style={s.sub}>{w.saved >= 0 ? `${formatINR(w.saved)} of the ${formatINR(w.income)} that came in` : `${formatINR(-w.saved)} more went out than came in`}</T>
    </>
  ) });
  if (w.netWorthChange != null) list.push({ key: 'nw', accent: Chip.indigo, second: Chip.purple, body: () => (
    <>
      <T style={s.kicker}>Net worth</T>
      <T d={100} style={[s.title, { color: w.netWorthChange! >= 0 ? Chip.green : Chip.red }]}>{w.netWorthChange! >= 0 ? 'Up' : 'Down'}</T>
      <Count to={Math.abs(w.netWorthChange!)} prefix="₹" />
      <T d={380} style={s.sub}>since the month before</T>
    </>
  ) });
  if (w.scoreChange != null && w.score != null) list.push({ key: 'score', accent: Chip.purple, second: Chip.indigo, body: () => (
    <>
      <T style={s.kicker}>Wealth score</T>
      <Count to={w.score!} suffix="/100" />
      <T d={300} style={s.sub}>{w.scoreChange! === 0 ? 'Same as the month before' : `${w.scoreChange! > 0 ? 'Up' : 'Down'} ${Math.abs(w.scoreChange!)} from the month before`}</T>
    </>
  ) });
  list.push({ key: 'persona', accent: Chip.purple, second: Chip.teal, body: () => null });
  return list;
}

// Month Wrapped: your month as a short story, one full screen at a time. Tap the right side for the next,
// the left side to go back, hold to pause. The last card is your badge, which you can share without amounts.
export default function WrappedScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : lastMonthKey();
  const { transactions, loading } = useTransactions('last12Months');
  const { investments } = useInvestments();
  const { settings } = useSettings();
  const { snapshots } = useAssets();
  const w = useMemo(() => (loading ? null : wrapped({ tx: transactions, investments, month, budget: settings.monthlyBudget, netWorth: snapshots, scoreLog: settings.scoreLog })), [loading, transactions, investments, month, settings.monthlyBudget, snapshots, settings.scoreLog]);
  const list = useMemo(() => (w ? cards(w) : []), [w]);
  const [i, setI] = useState(0);
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const last = i === list.length - 1;

  const next = () => setI((k) => Math.min(list.length - 1, k + 1));
  const prev = () => setI((k) => Math.max(0, k - 1));
  const run = (from = 0) => {
    if (last || reduce) return;
    p.value = from;
    p.value = withTiming(1, { duration: MS * (1 - from), easing: Easing.linear }, (done) => { if (done) runOnJS(next)(); });
  };
  useEffect(() => { if (list.length) run(0); if (last && list.length > 1) celebrate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i, list.length]);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  const share = async () => {
    if (!w) return;
    const message = wrappedShareText(w);
    if (Platform.OS === 'web') {
      // Browsers: the share sheet where there is one, otherwise copy the text
      const nav = globalThis.navigator as Navigator | undefined;
      try {
        if (nav?.share) { await nav.share({ text: message }); return; }
        await nav?.clipboard?.writeText(message);
        showToast({ message: 'Copied. Paste it anywhere.' });
      } catch { /* closed the share sheet */ }
      return;
    }
    try { await Share.share({ message }); } catch { showToast({ message: 'Sharing is not available here' }); }
  };

  if (!w || !list.length) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={FG} /></View>;
  }
  if (!w.hasData) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }]}>
        <Text style={s.title}>Nothing logged in {w.name}</Text>
        <Text style={s.sub}>Log what you spend this month and your story will be ready on the 1st.</Text>
        <Pressable onPress={close} style={s.done}><Text style={s.doneText}>Close</Text></Pressable>
      </View>
    );
  }
  const c = list[i];
  return (
    <View style={s.root}>
      <Animated.View key={`a${c.key}`} entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill} pointerEvents="none"><Aura color={c.accent} second={c.second} /></Animated.View>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.bars}>
          {list.map((x, k) => (
            <View key={x.key} style={s.barBg}>
              {k < i ? <View style={[s.barFill, { width: '100%' }]} /> : k === i ? <Animated.View style={[s.barFill, last || reduce ? { width: '100%' } : bar]} /> : null}
            </View>
          ))}
        </View>
        <View style={s.head}>
          <Text style={s.brand}>Corpus</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close"><Ionicons name="close" size={26} color={FG} /></Pressable>
        </View>
        <Pressable
          style={{ flex: 1 }}
          onPressIn={() => cancelAnimation(p)}
          onPressOut={() => run(p.value)}
          onLongPress={() => {}}
          delayLongPress={250}
          onPress={(e) => (e.nativeEvent.locationX < width / 3 ? prev() : last ? null : next())}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Your badge' : 'Next'}
          accessibilityHint="Tap the left side to go back"
        >
          <View key={c.key} style={s.card}>
            {c.key === 'persona' ? (
              <>
                <T style={s.kicker}>Your {w.name} badge</T>
                <Animated.View entering={ZoomIn.delay(150).springify().damping(10)} style={[s.badge, { shadowColor: c.accent, borderColor: c.accent }]}>
                  <Ionicons name={w.persona.icon as keyof typeof Ionicons.glyphMap} size={72} color={FG} />
                </Animated.View>
                <T d={300} style={s.title}>{w.persona.title}</T>
                <T d={420} style={s.sub}>{w.persona.line}</T>
              </>
            ) : c.body(w)}
          </View>
        </Pressable>
        {last ? (
          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={s.actions}>
            <Pressable onPress={share} style={s.share} accessibilityRole="button"><Ionicons name="share-social" size={18} color={STORY_BG} /><Text style={s.shareText}>Share my badge</Text></Pressable>
            <Pressable onPress={close} style={s.done} accessibilityRole="button"><Text style={s.doneText}>Done</Text></Pressable>
            <Text style={s.note}>Sharing sends percentages and your badge, never your amounts.</Text>
          </Animated.View>
        ) : (
          <Text style={s.hint}>Tap to continue. Hold to pause.</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: STORY_BG },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  barBg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: FG + '33', overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2, backgroundColor: FG },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
  brand: { fontSize: Type.title, fontFamily: Font.brand, color: FG },
  card: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  kicker: { fontSize: Type.input, fontFamily: Font.display, color: FG, opacity: 0.75 },
  title: { fontSize: Type.amount, lineHeight: 40, fontFamily: Font.brand, color: FG, letterSpacing: -1 },
  huge: { fontSize: Type.story, lineHeight: 72, fontFamily: Font.displayBold, color: FG, letterSpacing: -2, ...tabular },
  text: { color: FG },
  sub: { fontSize: Type.title, lineHeight: 24, color: FG, opacity: 0.85 },
  cal: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14, maxWidth: 7 * 30 + 6 * 8 },
  calDay: { width: 30, height: 30, borderRadius: 9 },
  badge: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', backgroundColor: FG + '18', borderWidth: 2, borderColor: FG + '55', shadowOpacity: 0.9, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, marginVertical: 12 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  share: { height: 54, borderRadius: 27, backgroundColor: FG, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareText: { fontSize: Type.input, fontFamily: Font.display, color: STORY_BG },
  done: { height: 50, borderRadius: 25, borderWidth: 1, borderColor: FG + '55', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  doneText: { fontSize: Type.input, fontFamily: Font.display, color: FG },
  note: { fontSize: Type.small, color: FG, opacity: 0.6, textAlign: 'center' },
  hint: { fontSize: Type.small, color: FG, opacity: 0.55, textAlign: 'center', paddingBottom: 16 },
});

import { celebrate } from '@/components/fx/Celebrate';
import Jarvy from '@/components/fx/Jarvy';
import { Screen, Tap } from '@/components/ui';
import { findCategory } from '@/constants/categories';
import { CategoryChip, Chip, Corpus, Font, Note, Pastel, tabular, Type } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { useVaults } from '@/hooks/useVaults';
import { saveSettings } from '@/services/settings';
import type { ActiveChallenge, ChallengeKind } from '@/types/settings';
import { CATALOG, dailyLimitFor, evaluate, infoOf, SKIPPABLE, todayKey, type ChallengeInfo } from '@/utils/challenges';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import ChallengeCard from './ChallengeCard';

const MAX_ACTIVE = 2;
const TILT = [-7, 5, -4, 8, -6];

// A badge as a round sticker: earned ones in their colour, the rest dashed and locked
export function Badge({ info, n = 1, i = 0, size = 92, locked }: { info: ChallengeInfo; n?: number; i?: number; size?: number; locked?: boolean }) {
  const t = Pastel[info.tone];
  return (
    <View style={[st.badge, { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: `${TILT[i % TILT.length]}deg` }] }, locked ? st.badgeOff : { backgroundColor: t.bg, borderColor: t.icon }]}
      accessibilityLabel={locked ? `${info.badge}, not earned yet` : `${info.badge}${n > 1 ? `, earned ${n} times` : ''}`}>
      <Ionicons name={(locked ? 'lock-closed' : info.icon) as keyof typeof Ionicons.glyphMap} size={size < 70 ? size * 0.4 : size * 0.24} color={locked ? Corpus.textFaint : t.icon} />
      {size >= 70 && <Text style={[st.badgeText, { color: locked ? Corpus.textFaint : t.fg, fontSize: size > 80 ? Type.caption : Type.micro }]} numberOfLines={2}>{info.badge}</Text>}
      {n > 1 && <View style={[st.times, { backgroundColor: t.icon }]}><Text style={st.timesText}>{n}x</Text></View>}
    </View>
  );
}

// Challenges: short goals you can finish, checked from what you log. Pick one from the row of cards,
// watch it on Today, collect the badge.
export default function ChallengesScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const { transactions } = useTransactions('last12Months');
  const { entries } = useVaults();
  const [skipCat, setSkipCat] = useState('shopping');
  const [busy, setBusy] = useState<string | null>(null);
  const active = settings.challenges?.active ?? [];
  const done = settings.challenges?.done ?? [];
  const limit = dailyLimitFor(transactions, settings.monthlyBudget);
  const cardW = Math.min(280, width * 0.72);

  const save = (next: { active?: ActiveChallenge[]; done?: typeof done }) => saveSettings({ challenges: { active: next.active ?? active, done: next.done ?? done } });
  const start = async (kind: ChallengeKind) => {
    if (active.length >= MAX_ACTIVE) { showToast({ message: 'Two at a time. Finish or stop one first.' }); return; }
    setBusy(kind);
    try {
      const c: ActiveChallenge = { id: `${kind}-${Date.now()}`, kind, start: todayKey(), ...(kind === 'skip7' ? { category: skipCat } : {}) };
      await save({ active: [...active, c] });
      showToast({ message: `Started: ${infoOf(kind).title(c.category)}. It shows on Today.` });
    } catch { showToast({ message: 'Could not start it. Try again.' }); } finally { setBusy(null); }
  };
  const stop = async (c: ActiveChallenge) => { setBusy(c.id); try { await save({ active: active.filter((x) => x.id !== c.id) }); } finally { setBusy(null); } };
  const retry = async (c: ActiveChallenge) => { setBusy(c.id); try { await save({ active: active.map((x) => (x.id === c.id ? { ...x, id: `${x.kind}-${Date.now()}`, start: todayKey() } : x)) }); } finally { setBusy(null); } };
  const collect = async (c: ActiveChallenge) => {
    setBusy(c.id);
    try {
      await save({ active: active.filter((x) => x.id !== c.id), done: [...done, { id: c.id, kind: c.kind, start: c.start, end: todayKey(), category: c.category }] });
      celebrate();
      showToast({ message: `Badge collected: ${infoOf(c.kind).badge}` });
    } finally { setBusy(null); }
  };

  const available = CATALOG.filter((x) => !active.some((a) => a.kind === x.kind));
  const earned = new Set(done.map((d) => d.kind)).size;
  const shelf = CATALOG.map((x) => ({ info: x, n: done.filter((d) => d.kind === x.kind).length }));
  const rows = [shelf.slice(0, 3), shelf.slice(3)];

  return (
    <Screen title="Challenges" tone={Chip.yellow} onBack={() => (router.canGoBack() ? router.back() : router.replace('/' as Href))}>
      <View style={st.hero}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.heroTitle}>Small wins,</Text>
          <Text style={st.heroSoft}>every week.</Text>
          <Text style={st.heroLine}>Pick a short goal. Corpus checks it from what you log. Finish it, keep the badge.</Text>
        </View>
        <View style={st.heroJar}><Jarvy mood={earned > 0 ? 'happy' : 'calm'} level={earned / CATALOG.length + 0.08} color={Chip.yellow} size={56} /></View>
      </View>
      <View style={st.stats}>
        <View style={st.stat}><Text style={st.statNum}>{earned}<Text style={st.statOf}>/{CATALOG.length}</Text></Text><Text style={st.statLabel}>badges</Text></View>
        <View style={[st.stat, st.statRule]}><Text style={st.statNum}>{active.length}<Text style={st.statOf}>/{MAX_ACTIVE}</Text></Text><Text style={st.statLabel}>running</Text></View>
        <View style={[st.stat, st.statRule]}><Text style={st.statNum}>{done.length}</Text><Text style={st.statLabel}>finished</Text></View>
      </View>

      {active.length > 0 && (
        <View style={st.section}>
          <Text style={st.h}>Going on now</Text>
          {active.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(i * 80).duration(300)}>
              <ChallengeCard c={c} st={evaluate(c, transactions, entries, limit)} busy={busy === c.id} onCollect={() => collect(c)} onRetry={() => retry(c)} onStop={() => stop(c)} />
            </Animated.View>
          ))}
        </View>
      )}

      {available.length > 0 && (
        <View style={st.section}>
          <View style={st.hRow}>
            <Text style={st.h}>{active.length ? 'Pick another' : 'Pick your first'}</Text>
            <Text style={st.hint}>Swipe</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 12} decelerationRate="fast" style={st.bleed} contentContainerStyle={st.row}>
            {available.map((x, i) => {
              const t = Pastel[x.tone];
              const title = x.title(x.kind === 'skip7' ? skipCat : undefined);
              const full = active.length >= MAX_ACTIVE;
              return (
                <Animated.View key={x.kind} entering={FadeInDown.delay(i * 60).duration(280)} style={[st.pick, { width: cardW, backgroundColor: t.bg }]}>
                  <View style={st.pickTop}>
                    <Badge info={x} i={i} size={74} />
                    <View style={st.metaCol}>
                      <View style={[st.meta, { borderColor: t.icon }]}><Text style={[st.metaText, { color: t.fg }]}>{x.length}</Text></View>
                      <View style={[st.meta, { borderColor: t.icon }]}><Text style={[st.metaText, { color: t.fg }]}>{x.level}</Text></View>
                    </View>
                  </View>
                  <Text style={[st.pickTitle, { color: t.fg }]}>{title}</Text>
                  <Text style={[st.pickText, { color: t.fg }]}>{x.kind === 'under7' ? `${x.blurb} Yours is about ₹${Math.round(limit).toLocaleString('en-IN')} a day.` : x.blurb}</Text>
                  {x.kind === 'skip7' && (
                    <View style={st.cats}>
                      {SKIPPABLE.map((id) => {
                        const on = id === skipCat;
                        return (
                          <Tap key={id} onPress={() => setSkipCat(id)} scaleTo={0.95} style={[st.cat, { borderColor: t.icon }, on && { backgroundColor: CategoryChip[id] ?? t.icon, borderColor: CategoryChip[id] ?? t.icon }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                            <Text style={[st.catText, { color: on ? Corpus.sheen : t.fg }]}>{findCategory('expense', id)?.label ?? id}</Text>
                          </Tap>
                        );
                      })}
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <Tap onPress={() => start(x.kind)} scaleTo={0.96} style={[st.start, { backgroundColor: full ? 'transparent' : t.fg, borderColor: t.fg }]} accessibilityRole="button" accessibilityLabel={`Start ${title}`}>
                    <Text style={[st.startText, { color: full ? t.fg : t.bg }]}>{busy === x.kind ? 'Starting' : full ? 'Two running already' : 'Start'}</Text>
                    {!full && <Ionicons name="arrow-forward" size={16} color={t.bg} />}
                  </Tap>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={st.section}>
        <Text style={st.h}>Your badge shelf</Text>
        <View style={st.shelfBox}>
          {rows.map((r, ri) => (
            <View key={ri} style={{ gap: 0 }}>
              <View style={st.shelfRow}>
                {r.map(({ info, n }, i) => (
                  <Animated.View key={info.kind} entering={ZoomIn.delay((ri * 3 + i) * 60).duration(260)}>
                    <Badge info={info} n={n} i={ri * 3 + i} locked={n === 0} size={86} />
                  </Animated.View>
                ))}
              </View>
              <View style={st.plank} />
            </View>
          ))}
        </View>
        <Text style={st.note}>{done.length ? `${done.length} finished so far. Each one stays on the shelf.` : 'Finish a challenge and its badge lands on the shelf.'}</Text>
      </View>

      <View style={st.how}>
        {[['hand-left', 'Pick one'], ['walk', 'Live as usual'], ['checkmark-done', 'Corpus checks each day']].map(([icon, text], i) => (
          <View key={text} style={st.step}>
            <View style={st.stepIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={Note.ink} /></View>
            <Text style={st.stepText}>{i + 1}. {text}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Note.bg, borderRadius: 28, padding: 20 },
  heroTitle: { fontSize: Type.h1, fontFamily: Font.displayBold, color: Note.ink, letterSpacing: -0.6, lineHeight: 32 },
  heroSoft: { fontSize: Type.amount, fontFamily: Font.serif, color: Note.ink, marginTop: -8, lineHeight: 38 },
  heroLine: { fontSize: Type.bodyLg, lineHeight: 20, color: Note.sub },
  heroJar: { transform: [{ rotate: '8deg' }] },
  stats: { flexDirection: 'row', backgroundColor: Corpus.card, borderRadius: 20, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statRule: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Corpus.border },
  statNum: { fontSize: Type.h2, fontFamily: Font.brand, color: Corpus.text, ...tabular },
  statOf: { fontSize: Type.label, color: Corpus.textMuted },
  statLabel: { fontSize: Type.small, color: Corpus.textMuted },
  section: { gap: 12, marginTop: 10 },
  hRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  h: { fontSize: Type.h3, fontFamily: Font.displayBold, color: Corpus.text, paddingHorizontal: 4 },
  hint: { fontSize: Type.small, color: Corpus.textMuted },
  bleed: { marginHorizontal: -16 },
  row: { gap: 12, paddingHorizontal: 16, paddingVertical: 6 },
  pick: { minHeight: 330, borderRadius: 28, padding: 18, gap: 10 },
  pickTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  metaCol: { gap: 6, alignItems: 'flex-end' },
  meta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1.5 },
  metaText: { fontSize: Type.small, fontFamily: Font.displayBold },
  pickTitle: { fontSize: Type.h2, lineHeight: 26, fontFamily: Font.displayBold, letterSpacing: -0.3 },
  pickText: { fontSize: Type.body, lineHeight: 19, opacity: 0.85 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cat: { height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center' },
  catText: { fontSize: Type.body, fontFamily: Font.display },
  start: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 23, borderWidth: 1.5 },
  startText: { fontSize: Type.label, fontFamily: Font.displayBold },
  shelfBox: { backgroundColor: Corpus.card, borderRadius: 24, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, gap: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: Corpus.border },
  shelfRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', minHeight: 92 },
  plank: { height: 6, borderRadius: 3, backgroundColor: Corpus.cardAlt, marginTop: 6 },
  note: { fontSize: Type.body, color: Corpus.textMuted, paddingHorizontal: 4 },
  how: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Note.bg, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: Type.small, color: Corpus.textMuted, textAlign: 'center' },
  badge: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 8 },
  badgeOff: { backgroundColor: Corpus.bg, borderColor: Corpus.border, borderStyle: 'dashed' },
  badgeText: { fontFamily: Font.displayBold, textAlign: 'center' },
  times: { position: 'absolute', top: -2, right: -2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  timesText: { fontSize: Type.micro, fontFamily: Font.displayBold, color: Corpus.sheen },
});

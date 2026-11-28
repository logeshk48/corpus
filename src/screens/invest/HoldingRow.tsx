import Sparkline from '@/components/charts/Sparkline';
import { Corpus, Font, Pastel, tabular, Type, type PastelName } from '@/constants/theme';
import { formatINR } from '@/utils/format';
import { formatChange, formatPct, formatPrice } from '@/utils/market';
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export type RowData = {
  key: string;
  title: string;          // RELIANCE, Parag Parikh Flexi Cap…
  sub: string;            // "10 shares · Avg ₹2,345" or "Mutual fund · 12.4 units"
  value?: number | null;  // current value (holdings) or price (watchlist)
  valueIsPrice?: boolean;
  pnl?: number | null;    // overall gain in ₹
  pnlPct?: number | null;
  ltp?: number | null;    // last price
  dayPct?: number | null; // change today
  dayChange?: number | null; // change today in price points (watchlist)
  dayLabel?: string;      // "today", "24h", "last NAV"
  spark?: number[];
  note?: string;          // a small line under the row (SIP, jar, stale)
  warn?: boolean;
  tone?: PastelName;      // the sticker's colour (by asset type)
  logo?: string | null;   // the company's or fund house's icon; the initials show if it fails
};

// One line of a holdings or watchlist table, like a broker app: name and quantity on the left, a month's
// sparkline in the middle, value and return on the right, and today's price move under it. When a live
// price ticks, the price flashes green or red for a moment.
export const HIDDEN = '₹ ••••';

const TONES: PastelName[] = ['lilac', 'sky', 'mint', 'butter', 'peach', 'rose'];
const hash = (t: string) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// "Parag Parikh Flexi Cap" → PP, "SILVERBEES" → SI
const initials = (t: string) => {
  const w = t.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? '?').slice(0, 2)).toUpperCase();
};

// A round sticker, slightly tilted: the company's logo on white when we have one, else the initials
// in the asset type's colour
function Sticker({ title, tone, logo }: { title: string; tone?: PastelName; logo?: string | null }) {
  const [failed, setFailed] = useState(false);
  const h = hash(title);
  const t = Pastel[tone ?? TONES[h % TONES.length]];
  const tilt = { transform: [{ rotate: `${(h % 13) - 6}deg` }] };
  if (logo && !failed) {
    return (
      <View style={[s.sticker, s.logoBadge, { borderColor: t.icon }, tilt]} aria-hidden>
        <Image source={{ uri: logo }} style={s.logo} resizeMode="contain" onError={() => setFailed(true)} />
      </View>
    );
  }
  return (
    <View style={[s.sticker, { backgroundColor: t.bg, borderColor: t.icon }, tilt]} aria-hidden>
      <Text style={[s.stickerText, { color: t.fg }]}>{initials(title)}</Text>
    </View>
  );
}

export default function HoldingRow({ d, first, hide, onPress, onLongPress, children }: { d: RowData; first?: boolean; hide?: boolean; onPress: () => void; onLongPress?: () => void; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const flash = useSharedValue(0);
  const prev = useRef(d.ltp);
  useEffect(() => {
    if (prev.current != null && d.ltp != null && d.ltp !== prev.current && !reduce) {
      flash.value = withSequence(withTiming(d.ltp > prev.current ? 1 : -1, { duration: 120 }), withTiming(0, { duration: 900 }));
    }
    prev.current = d.ltp;
  }, [d.ltp, reduce, flash]);
  const flashStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(flash.value, [-1, 0, 1], [Corpus.dangerTint, 'transparent', Corpus.incomeTint]) }));
  const up = (d.pnl ?? 0) >= 0;
  const dayUp = (d.dayPct ?? 0) >= 0;
  return (
    <View style={[!first && s.line]}>
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: Corpus.cardAlt }]}
      accessibilityRole="button"
      accessibilityLabel={`${d.title}. ${d.sub}. ${d.value != null && !hide ? formatINR(Math.round(d.value)) : ''}${d.pnl != null && !hide ? `, ${up ? 'up' : 'down'} ${formatINR(Math.abs(Math.round(d.pnl)))}` : ''}${d.dayPct != null ? `, ${formatPct(d.dayPct)} ${d.dayLabel ?? 'today'}` : ''}`}>
      <View style={s.top}>
        <Sticker title={d.title} tone={d.tone} logo={d.logo} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.title} numberOfLines={2}>{d.title}</Text>
          <Text style={[s.sub, d.warn && { color: Corpus.warning }]} numberOfLines={2}>{d.sub}</Text>
        </View>
        {d.spark && d.spark.length > 1 ? <Sparkline values={d.spark} width={48} height={26} /> : <View style={{ width: 48 }} />}
        <View style={s.right}>
          <Text style={s.value}>{d.value == null ? '' : d.valueIsPrice ? formatPrice(d.value) : hide ? HIDDEN : formatINR(Math.round(d.value))}</Text>
          {d.pnl != null ? (
            <Text style={[s.pnl, { color: up ? Corpus.income : Corpus.danger }]}>{hide ? '' : `${up ? '+' : '−'}${formatINR(Math.abs(Math.round(d.pnl)))} `}{d.pnlPct != null ? `(${formatPct(d.pnlPct)})` : ''}</Text>
          ) : d.dayPct != null ? (
            <Text style={[s.pnl, { color: dayUp ? Corpus.income : Corpus.danger }]}>{d.dayChange != null ? `${formatChange(d.dayChange)} (${formatPct(d.dayPct)})` : formatPct(d.dayPct)}</Text>
          ) : null}
        </View>
      </View>
      {(d.ltp != null || !!d.note) && (
        <View style={s.bottom}>
          {d.ltp != null && !d.valueIsPrice ? (
            <Animated.View style={[s.ltpBox, flashStyle]}>
              <Text style={s.sub}>LTP <Text style={{ color: Corpus.text }}>{formatPrice(d.ltp)}</Text></Text>
              {d.dayPct != null && <Text style={[s.sub, { color: dayUp ? Corpus.income : Corpus.danger, fontFamily: Font.display }]}>({formatPct(d.dayPct)})</Text>}
            </Animated.View>
          ) : <View />}
          {!!d.note && <Text style={s.note} numberOfLines={1}>{d.note}</Text>}
        </View>
      )}
    </Pressable>
      {/* buttons under a row live outside its tap area: a button inside a button is invalid on web */}
      {Children.toArray(children).length > 0 ? <View style={s.extra}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Corpus.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: Type.label, fontFamily: Font.display, color: Corpus.text },
  sub: { fontSize: Type.small, color: Corpus.textMuted, ...tabular },
  right: { alignItems: 'flex-end', gap: 2, minWidth: 84 },
  value: { fontSize: Type.label, fontFamily: Font.displayBold, color: Corpus.text, ...tabular },
  pnl: { fontSize: Type.small, fontFamily: Font.display, ...tabular },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 46 },
  sticker: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  logoBadge: { backgroundColor: Corpus.sheen, overflow: 'hidden' },
  logo: { width: 22, height: 22, borderRadius: 4 },
  stickerText: { fontSize: Type.small, fontFamily: Font.displayBold, letterSpacing: 0.3 },
  ltpBox: { flexDirection: 'row', gap: 4, borderRadius: 6, paddingHorizontal: 4, marginLeft: -4 },
  extra: { paddingLeft: 62, paddingRight: 16, paddingBottom: 12, marginTop: -6, gap: 6 },
  note: { fontSize: Type.small, color: Corpus.textMuted, flexShrink: 1, textAlign: 'right' },
});

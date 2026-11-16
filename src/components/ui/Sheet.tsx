import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Duration, EaseIn, Spring } from '@/constants/motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import {
  Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The one bottom sheet every form uses: title + close, scrolling body, pinned actions.
// Motion: the backdrop fades while the sheet springs up; drag the top down (or tap outside) and it slides away
// faster than it came (skill: modal-motion, gesture-feedback, exit-faster-than-enter).
export default function Sheet({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const H = Dimensions.get('window').height;
  const y = useSharedValue(reduce ? 0 : H);
  const fade = useSharedValue(reduce ? 1 : 0);
  const closing = useRef(false);

  useEffect(() => {
    if (reduce) return;
    y.value = withSpring(0, Spring.sheet);
    fade.value = withTiming(1, { duration: Duration.enter });
  }, [reduce, y, fade]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reduce) return onClose();
    fade.value = withTiming(0, { duration: Duration.exit });
    y.value = withTiming(H, { duration: Duration.exit + 40, easing: EaseIn }, (done) => { if (done) runOnJS(onClose)(); });
  };

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onChange((e) => { y.value = e.translationY > 0 ? e.translationY : e.translationY / 4; })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(close)();
      else y.value = withSpring(0, Spring.sheet);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[StyleSheet.absoluteFill, s.scrim, scrimStyle]}>
            <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" accessibilityRole="button" />
          </Animated.View>
          <Animated.View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, Space.md) + 4 }, sheetStyle]} accessibilityViewIsModal>
            <GestureDetector gesture={drag}>
              <View style={{ gap: Space.md }}>
                <View style={s.handle} />
                <View style={s.head}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
                    {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
                  </View>
                  <Pressable onPress={close} hitSlop={6} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Close">
                    <Ionicons name="close" size={18} color={Corpus.text} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer && <View style={s.footer}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

// A labelled input. `money` adds a ₹ prefix and the number keyboard.
export function Field({ label, hint, error, money, right, ...input }: TextInputProps & {
  label: string; hint?: string; error?: string; money?: boolean; right?: ReactNode;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.box, focus && s.boxFocus, !!error && s.boxError]}>
        {money && <Text style={s.prefix}>₹</Text>}
        <TextInput
          placeholderTextColor={Corpus.textFaint}
          keyboardType={money ? 'decimal-pad' : input.keyboardType}
          accessibilityLabel={label}
          {...input}
          onFocus={(e) => { setFocus(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); input.onBlur?.(e); }}
          style={[s.input, money && s.money, input.style]}
        />
        {right}
      </View>
      {error ? (
        <View style={s.msgRow}>
          <Ionicons name="alert-circle" size={14} color={Corpus.danger} />
          <Text style={[s.msg, { color: Corpus.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={s.msg}>{hint}</Text>
      ) : null}
    </View>
  );
}

// Single-choice pills (account type, frequency…). Selected = filled brand pill, so it never relies on colour alone.
export function Choice<T extends string>({ options, value, onChange, label, tiles }: {
  options: readonly { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void; label?: string;
  tiles?: boolean; // equal-width tiles, icon over label (for 3–4 short options)
}) {
  return (
    <View style={s.field}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={[s.choices, tiles && { flexWrap: 'nowrap' }]} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={({ pressed }) => [s.choice, tiles && s.choiceTile, on && s.choiceOn, pressed && { opacity: 0.7 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              {o.icon && <Ionicons name={(on ? o.icon.replace('-outline', '') : o.icon) as keyof typeof Ionicons.glyphMap} size={tiles ? 20 : 16} color={on ? Corpus.onGold : Corpus.text} />}
              <Text style={[s.choiceText, on && { color: Corpus.onGold }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// The switch knob springs across instead of jumping
function Switch({ on }: { on: boolean }) {
  const x = useSharedValue(on ? 18 : 0);
  useEffect(() => { x.value = withSpring(on ? 18 : 0, Spring.snappy); }, [on, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[s.track, on && s.trackOn]}>
      <Animated.View style={[s.knob, on && { backgroundColor: Corpus.onGold }, knob]} />
    </View>
  );
}

// A row with a title, a hint and an on/off control
export function Toggle({ title, hint, value, onChange, icon = 'star' }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={({ pressed }) => [s.toggle, pressed && { opacity: 0.8 }]} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Ionicons name={(value ? icon : `${icon}-outline`) as keyof typeof Ionicons.glyphMap} size={20} color={Corpus.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        {!!hint && <Text style={s.msg}>{hint}</Text>}
      </View>
      <Switch on={value} />
    </Pressable>
  );
}

// ‹ value › : step through a short ordered set (a day of the month, a month, a date). Arrows are 44pt targets.
export function Stepper({ label, value, sub, onPrev, onNext, prevDisabled, nextDisabled, hint, extra }: {
  label: string; value: string; sub?: string; onPrev: () => void; onNext: () => void;
  prevDisabled?: boolean; nextDisabled?: boolean; hint?: string; extra?: { label: string; onPress: () => void };
}) {
  const arrow = (icon: 'chevron-back' | 'chevron-forward', off: boolean | undefined, go: () => void, name: string) => (
    <Pressable onPress={go} disabled={off} style={({ pressed }) => [s.stepArrow, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${name} ${label}`} accessibilityState={{ disabled: !!off }}>
      <Ionicons name={icon} size={20} color={off ? Corpus.textFaint : Corpus.text} />
    </Pressable>
  );
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.box, s.stepBox]}>
          {arrow('chevron-back', prevDisabled, onPrev, 'Earlier')}
          <View style={{ flex: 1, alignItems: 'center' }} accessibilityLiveRegion="polite">
            <Text style={s.stepValue}>{value}</Text>
            {!!sub && <Text style={s.msg}>{sub}</Text>}
          </View>
          {arrow('chevron-forward', nextDisabled, onNext, 'Later')}
        </View>
        {extra && (
          <Pressable onPress={extra.onPress} style={({ pressed }) => [s.choice, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={s.choiceText}>{extra.label}</Text>
          </Pressable>
        )}
      </View>
      {!!hint && <Text style={s.msg}>{hint}</Text>}
    </View>
  );
}

// A day you already lived: today or earlier, one day at a time
export function DayStepper({ label, value, onChange, hint }: { label: string; value: Date; onChange: (d: Date) => void; hint?: string }) {
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const move = (n: number) => onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate() + n, 9));
  const isToday = same(value, today);
  const full = value.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <Stepper label={label} hint={hint} value={isToday ? 'Today' : same(value, new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) ? 'Yesterday' : full}
      sub={isToday ? full : undefined} onPrev={() => move(-1)} onNext={() => move(1)} nextDisabled={isToday || value > today}
      extra={isToday ? undefined : { label: 'Today', onPress: () => onChange(new Date()) }} />
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { backgroundColor: Corpus.scrim },
  sheet: {
    width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: Corpus.card,
    borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 8, paddingHorizontal: Space.lg, gap: Space.md,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: Corpus.border },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, paddingTop: 4 },
  title: { fontSize: Type.h2, fontFamily: Font.displayBold, color: Corpus.text, letterSpacing: -0.3 },
  subtitle: { fontSize: Type.body, color: Corpus.textMuted, lineHeight: 18 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: Corpus.cardAlt, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Space.md + 2, paddingBottom: Space.sm },
  footer: { gap: Space.sm },
  field: { gap: 7 },
  label: { fontSize: Type.body, fontFamily: Font.display, color: Corpus.text },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 16, backgroundColor: Corpus.bg, borderWidth: 1.5, borderColor: Corpus.bg, paddingHorizontal: 14, gap: 6 },
  boxFocus: { borderColor: Corpus.text },
  boxError: { borderColor: Corpus.danger },
  prefix: { fontSize: Type.title, fontFamily: Font.display, color: Corpus.textMuted },
  input: { flex: 1, fontSize: Type.input, color: Corpus.text, paddingVertical: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  money: { fontSize: Type.title, fontFamily: Font.display, ...tabular },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  msg: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: Corpus.bg },
  choiceTile: { flex: 1, flexDirection: 'column', gap: 4, minHeight: 64, paddingHorizontal: 4, borderRadius: 18, justifyContent: 'center' },
  choiceOn: { backgroundColor: Corpus.gold },
  choiceText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  stepBox: { flex: 1, paddingHorizontal: 4 },
  stepArrow: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: Type.input, fontFamily: Font.display, color: Corpus.text, ...tabular },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 16, backgroundColor: Corpus.bg, padding: 14 },
  toggleTitle: { fontSize: Type.label, color: Corpus.text },
  track: { width: 46, height: 28, borderRadius: 14, backgroundColor: Corpus.border, padding: 3 },
  trackOn: { backgroundColor: Corpus.gold },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'white' },
});

import { Corpus, Font, Space, tabular, Type } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The one bottom sheet every form uses: title + close, scrolling body, pinned actions.
// ui-ux-pro-max: visible labels (not placeholder-only), errors next to the field, 44pt targets.
export default function Sheet({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, Space.md) + 4 }]} accessibilityViewIsModal>
          <View style={s.handle} />
          <View style={s.head}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
              {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={6} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={Corpus.text} />
            </Pressable>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer && <View style={s.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
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

// A row with a title, a hint and an on/off control
export function Toggle({ title, hint, value, onChange, icon = 'star' }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={({ pressed }) => [s.toggle, pressed && { opacity: 0.8 }]} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Ionicons name={(value ? icon : `${icon}-outline`) as keyof typeof Ionicons.glyphMap} size={20} color={Corpus.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        {!!hint && <Text style={s.msg}>{hint}</Text>}
      </View>
      <View style={[s.track, value && s.trackOn]}>
        <View style={[s.knob, value && s.knobOn]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: Corpus.scrim },
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
  input: { flex: 1, fontSize: Type.input, color: Corpus.text, paddingVertical: 12 },
  money: { fontSize: Type.title, fontFamily: Font.display, ...tabular },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  msg: { fontSize: Type.small, color: Corpus.textMuted, lineHeight: 17 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: Corpus.bg },
  choiceTile: { flex: 1, flexDirection: 'column', gap: 4, minHeight: 64, paddingHorizontal: 4, borderRadius: 18, justifyContent: 'center' },
  choiceOn: { backgroundColor: Corpus.gold },
  choiceText: { fontSize: Type.bodyLg, fontFamily: Font.display, color: Corpus.text },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 16, backgroundColor: Corpus.bg, padding: 14 },
  toggleTitle: { fontSize: Type.label, color: Corpus.text },
  track: { width: 46, height: 28, borderRadius: 14, backgroundColor: Corpus.border, padding: 3 },
  trackOn: { backgroundColor: Corpus.gold },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'white' },
  knobOn: { transform: [{ translateX: 18 }], backgroundColor: Corpus.onGold },
});

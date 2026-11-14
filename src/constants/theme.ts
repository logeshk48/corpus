/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { readThemeChoice, resolveScheme } from './themeChoice';

// ─── Corpus Design System ───────────────────────────────
const LIGHT = {
  // Surfaces — Apple-style light: grouped grey background, white cards
  bg: '#F2F2F7',        // app background (systemGroupedBackground)
  card: '#FFFFFF',      // cards, grouped lists
  cardAlt: '#EFEFF4',   // icon circles, nested elements, inputs
  border: '#E3E3E8',    // hairline separators

  // Brand tint (kept under the old name "gold" so every screen picks it up)
  gold: '#0A7D4F',      // Corpus green — active states, key numbers, buttons
  goldSoft: '#34C77B',  // lighter green for subtle accents

  // Text
  text: '#000000',      // primary label
  textMuted: '#6C6C70', // secondary label (passes 4.5:1 on white)
  textFaint: '#8E8E93', // tertiary: icons, chevrons, placeholders

  // Semantic (darker shades than iOS defaults so text stays readable on white)
  income: '#1E8A47',    // money in
  danger: '#D92D20',    // over budget, delete
  warning: '#B45F00',   // 80% alerts, due soon

  // Text/icons placed ON the brand colour (buttons, active chips)
  onGold: '#FFFFFF',

  // Tints: a light wash + a hairline for each semantic colour.
  goldTint: '#E8F5EE',
  goldLine: '#BFE3CF',
  goldActive: '#D7EFE2',
  incomeTint: '#E8F6EC',
  incomeLine: '#C2E5CB',
  warningTint: '#FFF4E5',
  warningLine: '#FFD9A8',
  dangerTint: '#FDEDEB',
  dangerLine: '#F7C5C0',
  violet: '#8944AB',      // loans / EMIs / recurring bills
  violetTint: '#F4EAFB',

  // Liquid-glass surfaces (tab bar, floating buttons): see-through white with a bright edge
  glass: 'rgba(255,255,255,0.78)',
  glassEdge: 'rgba(255,255,255,0.95)',
  shadow: 'rgba(0,0,0,0.14)',
};
// Apple-style dark: true black background, raised grey cards, brighter tints
const DARK: typeof LIGHT = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  border: '#38383A',
  gold: '#30D158',
  goldSoft: '#7EE2A0',
  text: '#FFFFFF',
  textMuted: '#A1A1A8',
  textFaint: '#7C7C82',
  income: '#30D158',
  danger: '#FF6961',
  warning: '#FFB340',
  onGold: '#000000',
  goldTint: '#10281B',
  goldLine: '#1E4A31',
  goldActive: '#163A27',
  incomeTint: '#10281B',
  incomeLine: '#1E4A31',
  warningTint: '#2E2210',
  warningLine: '#5A4320',
  dangerTint: '#2E1614',
  dangerLine: '#5C2724',
  violet: '#C987F2',
  violetTint: '#2A1838',
  glass: 'rgba(40,40,42,0.78)',
  glassEdge: 'rgba(255,255,255,0.16)',
  shadow: 'rgba(0,0,0,0.55)',
};

// Picked once at startup; changing the theme in Settings restarts the app's screens with the new one
export const themeChoice = readThemeChoice();
export const isDark = resolveScheme(themeChoice) === 'dark';
export const Corpus = isDark ? DARK : LIGHT;

// Apple-style type: the phone's own system font (SF Pro on iPhone, Roboto on Android) for everything.
// Weight comes from fontWeight next to it.
const SYSTEM = Platform.select({ ios: 'System', android: 'sans-serif', default: "-apple-system, 'SF Pro Display', 'Segoe UI', Roboto, Inter, system-ui, sans-serif" });
export const Font = {
  display: SYSTEM,     // screen headings, card titles (with fontWeight '600'/'700')
  displayBold: SYSTEM, // amounts (with fontWeight '700')
};

// Apple-style icon squares: one colour per kind of thing (white symbol on top)
export const Chip = {
  green: '#1E9E5A', blue: '#0A72E8', indigo: '#5856D6', purple: '#A050D0', pink: '#E8335A',
  red: '#E5372C', orange: '#F28A00', yellow: '#E0A800', teal: '#14A3B8', gray: '#8E8E93',
};
// Category → chip colour (expense + income ids)
export const CategoryChip: Record<string, string> = {
  food: Chip.orange, travel: Chip.blue, shopping: Chip.pink, bills: Chip.red, health: Chip.green,
  fun: Chip.purple, education: Chip.indigo, other: Chip.gray,
  salary: Chip.green, client: Chip.teal, business: Chip.yellow,
};

// Type scale: the only font sizes used in the app
export const Type = {
  micro: 10,    // chart value labels, tiny badges
  caption: 11,  // UPPERCASE section labels, field labels
  small: 12,    // hints, secondary lines
  body: 13,     // default secondary text
  bodyLg: 14,   // default primary text in rows
  label: 15,    // row titles, buttons
  input: 16,    // text inputs, primary buttons
  title: 17,    // card titles, sheet headings
  h3: 20,       // stat values, avatars
  h2: 22,       // sub-headings
  h1: 28,       // screen headings
  brand: 30,    // CORPUS wordmark
  amount: 34,   // hero amount at the top of a screen
  hero: 40,     // Home Safe-to-Spend number
  entry: 44,    // the amount you're typing (Add, budget editor)
};

export const Space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
// ────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
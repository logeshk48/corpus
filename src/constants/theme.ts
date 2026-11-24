/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { readThemeChoice, resolveScheme } from './themeChoice';

// ─── Corpus Design System ───────────────────────────────
const LIGHT = {
  // Graphite + green (picked with the ui-ux-pro-max skill): black-and-white premium surfaces,
  // and green / amber / red ONLY ever mean money status — never decoration.
  bg: '#F4F4F1',        // warm off-white background (skill: no pure white backgrounds)
  card: '#FFFFFF',      // cards, grouped lists
  cardAlt: '#EDEDE9',   // icon circles, nested elements, inputs
  border: '#E4E4DF',    // hairline separators

  // Brand ("gold" kept as the token name so every screen picks it up): graphite
  gold: '#111111',      // primary buttons, selected tab, links
  goldSoft: '#3A3A37',

  text: '#111111',
  textMuted: '#5F5F5B', // secondary (6.3:1 on white)
  textFaint: '#6E6E69', // tertiary hints, chevrons (5.1:1)

  income: '#0F7A45',    // money in · on track
  danger: '#C8322B',    // over · delete
  warning: '#A85A00',   // tight · due soon

  onGold: '#FFFFFF',

  goldTint: '#EAEAE6',  // selected chip / tab background
  goldLine: '#D6D6D0',
  goldActive: '#E2E2DD',
  incomeTint: '#E0F2E7',
  incomeLine: '#BFE3CC',
  warningTint: '#FFF1DC',
  warningLine: '#F5D29C',
  dangerTint: '#FCE8E6',
  dangerLine: '#F2C2BD',
  violet: '#7A3FA0',
  violetTint: '#F1E8F7',

  glass: 'rgba(255,255,255,0.74)',
  glassEdge: 'rgba(255,255,255,0.92)',
  shadow: 'rgba(0,0,0,0.12)',
  sheen: '#FFFFFF',          // the light catching glass (jars)
  scrim: 'rgba(0,0,0,0.38)',  // behind sheets
  glow: 0.55,           // living-background strength
};

// Pure black (OLED) with raised graphite cards; the brand flips to near-white
const DARK: typeof LIGHT = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  border: '#38383A',
  gold: '#F5F5F0',
  goldSoft: '#D9D9D4',
  text: '#FFFFFF',
  textMuted: '#A1A1A8',
  textFaint: '#8E8E93',
  income: '#32D27A',
  danger: '#FF6961',
  warning: '#FFB340',
  onGold: '#000000',
  goldTint: '#2C2C2E',
  goldLine: '#48484A',
  goldActive: '#3A3A3C',
  incomeTint: '#0F2A1C',
  incomeLine: '#1E4A31',
  warningTint: '#2E2210',
  warningLine: '#5A4320',
  dangerTint: '#2E1614',
  dangerLine: '#5C2724',
  violet: '#C987F2',
  violetTint: '#2A1838',
  glass: 'rgba(36,36,38,0.78)',
  glassEdge: 'rgba(255,255,255,0.14)',
  shadow: 'rgba(0,0,0,0.55)',
  sheen: '#FFFFFF',
  scrim: 'rgba(0,0,0,0.66)',
  glow: 0.5,
};

export const themeChoice = readThemeChoice();
export const isDark = resolveScheme(themeChoice) === 'dark';
export const Corpus = isDark ? DARK : LIGHT;

// Type: Inter for amounts and headings (bundled, assets/fonts — looks the same on iPhone, Android, web),
// the phone's system font for everything else. A custom face carries its own weight: never add fontWeight next to it.
export const Font = {
  display: 'Inter-SemiBold',   // headings, card titles
  displayBold: 'Inter-Bold',   // amounts, large titles
  brand: 'Bricolage-Bold',     // the Corpus wordmark only
};
// Amounts line up and don't jiggle while counting up
export const tabular = { fontVariant: ['tabular-nums'] as ('tabular-nums')[] };

// Gen Z bento tiles: soft pastel backgrounds with deep text (all ≥ 4.5:1). Decorative — never used for money status.
type Tone = { bg: string; fg: string; icon: string };
const PASTEL_LIGHT: Record<'lilac' | 'peach' | 'sky' | 'butter' | 'mint' | 'rose', Tone> = {
  lilac: { bg: '#ECE6FF', fg: '#3B2A86', icon: '#6A4FE0' },
  peach: { bg: '#FFE6D9', fg: '#7A2E0E', icon: '#E0632C' },
  sky: { bg: '#DDEEFF', fg: '#123F73', icon: '#2B7BD6' },
  butter: { bg: '#FFF2C2', fg: '#5C4500', icon: '#B98900' },
  mint: { bg: '#D9F5E5', fg: '#0E5A34', icon: '#1E9E5A' },
  rose: { bg: '#FFE1EA', fg: '#7C1D3B', icon: '#D6336C' },
};
const PASTEL_DARK: typeof PASTEL_LIGHT = {
  lilac: { bg: '#231C3D', fg: '#DCD3FF', icon: '#A897FF' },
  peach: { bg: '#3A2218', fg: '#FFD5C2', icon: '#FF9A6B' },
  sky: { bg: '#16273D', fg: '#CDE4FF', icon: '#6FB1FF' },
  butter: { bg: '#332A0E', fg: '#FFEBA8', icon: '#F5C842' },
  mint: { bg: '#11291D', fg: '#C2F1D6', icon: '#4CD98B' },
  rose: { bg: '#3A1824', fg: '#FFCCDA', icon: '#FF7FA3' },
};
export const Pastel = isDark ? PASTEL_DARK : PASTEL_LIGHT;
export type PastelName = keyof typeof PASTEL_LIGHT;

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
  entry: 44,    // the amount you're typing (Add, budget editor); also the Corpus wordmark on sign-in
  story: 64,    // the big count-up number on Month Wrapped cards
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
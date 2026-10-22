/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Corpus Design System ───────────────────────────────
export const Corpus = {
  // Surfaces
  bg: '#0F1115',        // app background
  card: '#1A1D24',      // cards
  cardAlt: '#23262E',   // icon circles, nested elements
  border: '#2A2E38',    // hairline borders

  // Brand
  gold: '#C9A227',      // THE color — hero numbers, active states
  goldSoft: '#E8D48A',  // lighter gold for subtle accents

  // Text
  text: '#F5F2E8',      // primary (warm cream)
  textMuted: '#8B8F98', // secondary labels
  textFaint: '#575B64', // disabled, inactive

  // Semantic
  income: '#4CAF7D',    // green for money in
  danger: '#E05252',    // red for over-budget
  warning: '#E0A452',   // amber for 80% alerts

  // Text/icons placed ON a gold surface (buttons, active chips)
  onGold: '#0F1115',

  // Tints: a dark wash + a hairline for each semantic colour.
  // Use the pair together, e.g. { backgroundColor: Corpus.warningTint, borderColor: Corpus.warningLine }
  goldTint: '#1E1B12',    // highlighted card / note
  goldLine: '#45391C',
  goldActive: '#2E2712',  // selected chip / segment
  incomeTint: '#1D2A22',
  incomeLine: '#2C4A38',
  warningTint: '#2E2412',
  warningLine: '#5A4520',
  dangerTint: '#2A1D1D',
  dangerLine: '#5A2A2A',
  violet: '#C88BDB',      // loans / EMIs / recurring bills
  violetTint: '#2A1F2E',
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
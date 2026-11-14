// Which theme to use: the phone's setting, or Light / Dark picked in Settings.
// Read synchronously at startup (before any screen builds its styles), kept on this device only.
import { Appearance, Platform } from 'react-native';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'corpus-theme';
const valid = (v: unknown): v is ThemeChoice => v === 'system' || v === 'light' || v === 'dark';

function themeFile() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File, Paths } = require('expo-file-system');
  return new File(Paths.document, 'corpus-theme.txt');
}

export function readThemeChoice(): ThemeChoice {
  try {
    if (Platform.OS === 'web') {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
      return valid(v) ? v : 'system';
    }
    const f = themeFile();
    const v = f.exists ? f.textSync().trim() : null;
    return valid(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemeChoice(c: ThemeChoice) {
  try {
    if (Platform.OS === 'web') { localStorage.setItem(KEY, c); return; }
    const f = themeFile();
    if (!f.exists) f.create();
    f.write(c);
  } catch {}
}

export const systemScheme = (): 'light' | 'dark' => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
export const resolveScheme = (c: ThemeChoice): 'light' | 'dark' => (c === 'system' ? systemScheme() : c);

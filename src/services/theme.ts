import { readThemeChoice, systemScheme, writeThemeChoice, type ThemeChoice } from '@/constants/themeChoice';
import { isDark } from '@/constants/theme';
import { reloadAppAsync } from 'expo';
import { Appearance, Platform } from 'react-native';

// Every screen builds its colours once at startup, so a theme change reloads the app's screens (about a second)
function restart() {
  if (Platform.OS === 'web') window.location.reload();
  else reloadAppAsync('Theme changed').catch(() => {});
}

export function setThemeChoice(c: ThemeChoice) {
  writeThemeChoice(c);
  try { Appearance.setColorScheme?.(c === 'system' ? 'unspecified' : c); } catch {}
  const wantDark = (c === 'system' ? systemScheme() : c) === 'dark';
  if (wantDark !== isDark) restart();
}

// Keep native bits (keyboard, alerts) in step with the chosen theme, and follow the phone when on "System"
export function watchSystemTheme() {
  const choice = readThemeChoice();
  if (choice !== 'system') {
    try { Appearance.setColorScheme?.(choice); } catch {}
    return () => {};
  }
  const sub = Appearance.addChangeListener(({ colorScheme }) => {
    if ((colorScheme === 'dark') !== isDark) restart();
  });
  return () => sub.remove();
}

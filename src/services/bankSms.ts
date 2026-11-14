// Bank SMS on Android: a "log it?" notification when your bank texts you, plus catching up from the inbox.
// Everything is read on the phone; only bank transaction SMS are ever looked at. iPhone / web: not available.
import { requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

export type RawSms = { id: string; from: string; body: string; ts: number };
type CorpusSms = {
  addListener(event: 'onShare', cb: (e: { text: string }) => void): { remove(): void };
  smsAvailable(): boolean;
  isEnabled(): boolean;
  setEnabled(on: boolean): void;
  getPending(): RawSms[];
  removePending(ids: string[]): void;
  readInbox(sinceMs: number, max: number): Promise<RawSms[]>;
  takeSharedText(): string | null;
};

const N = Platform.OS === 'android' ? requireOptionalNativeModule<CorpusSms>('CorpusSms') : null;

// Share → Corpus works in every Android build; reading SMS only in the "sms" build
export const shareSupported = !!N;
export const smsSupported = (() => { try { return !!N?.smsAvailable(); } catch { return false; } })();
export const smsEnabled = () => !!N?.isEnabled();

// Built lazily: PermissionsAndroid doesn't exist on the web
const perms = () => [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, PermissionsAndroid.PERMISSIONS.READ_SMS];

export async function smsPermitted() {
  if (!N) return false;
  const r = await Promise.all(perms().map((p) => PermissionsAndroid.check(p)));
  return r.every(Boolean);
}

// Ask for SMS permission and switch the listener on. Returns false if you said no.
export async function enableSms(): Promise<boolean> {
  if (!N) return false;
  const P = perms();
  const res = await PermissionsAndroid.requestMultiple(P);
  const ok = P.every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
  N.setEnabled(ok);
  return ok;
}
export const disableSms = () => N?.setEnabled(false);

export const pendingSms = (): RawSms[] => (N ? N.getPending() : []);
export const dropSms = (ids: string[]) => { if (N && ids.length) N.removePending(ids); };

export async function inboxSms(days: number): Promise<RawSms[]> {
  if (!N || !(await smsPermitted())) return [];
  return N.readInbox(Date.now() - days * 86_400_000, 300);
}

export function takeSharedText(): string | null {
  try { return N?.takeSharedText() ?? null; } catch { return null; }
}
export function onShared(cb: (text: string) => void) {
  const sub = N?.addListener('onShare', (e) => cb(e.text));
  return () => sub?.remove();
}

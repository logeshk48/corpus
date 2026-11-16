// Ask before something destructive, in a way that works everywhere.
// Phones use the native alert (in the screens). On the web, browsers and in-app previews can block
// window.confirm (it returns false at once and nothing happens), so we show our own sheet instead.
export type ConfirmRequest = { title: string; message?: string; ok: string; destructive: boolean; resolve: (yes: boolean) => void };

let show: ((r: ConfirmRequest) => void) | null = null;
export const setConfirmHost = (fn: typeof show) => { show = fn; };

// "Title\n\nMessage" (the old window.confirm text) or separate parts
export function askWeb(text: string, ok = 'Yes', destructive = true): Promise<boolean> {
  const [title, ...rest] = text.split('\n\n');
  if (!show) return Promise.resolve(typeof window !== 'undefined' && window.confirm(text));
  return new Promise((resolve) => show!({ title, message: rest.join('\n\n') || undefined, ok, destructive, resolve }));
}

import { DEFAULT_SETTINGS, type Settings } from '@/types/settings';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// One document per user: users/{uid}/settings/main
function settingsDoc() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return doc(db, 'users', uid, 'settings', 'main');
}

// LIVE READ: always returns a complete Settings object (defaults fill the gaps)
export function subscribeSettings(
  onChange: (settings: Settings) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    settingsDoc(),
    (snap) => onChange({ ...DEFAULT_SETTINGS, ...(snap.data() ?? {}) }),
    onError
  );
}

// SAVE: merges the fields you pass; a field passed as `undefined` is removed.
// Works even if the document doesn't exist yet (merge creates it).
export async function saveSettings(changes: Partial<Settings>) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    data[key] = value === undefined ? deleteField() : value;
  }
  await setDoc(settingsDoc(), data, { merge: true });
}

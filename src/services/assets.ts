import type { ManualAsset, NewManualAsset } from '@/types/asset';
import type { NwTotals } from '@/utils/netWorth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not signed in');
  return u;
}
// users/{uid}/assets/{id}
const assetsCol = () => collection(db, 'users', uid(), 'assets');

export function subscribeAssets(onChange: (a: ManualAsset[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(query(assetsCol(), orderBy('addedAt')), (s) => onChange(s.docs.map((d) => ({ id: d.id, ...(d.data() as NewManualAsset) }))), onError);
}
export async function addAsset(a: NewManualAsset) {
  return (await addDoc(assetsCol(), { ...clean(a), createdAt: serverTimestamp() })).id;
}
export async function updateAsset(id: string, changes: Partial<NewManualAsset>) {
  await updateDoc(doc(assetsCol(), id), toUpdateData(changes));
}
export async function deleteAsset(id: string) {
  await deleteDoc(doc(assetsCol(), id));
}

// users/{uid}/netWorth/{YYYY-MM}: this month's figures, overwritten until the month ends.
// Keeps history honest even after you later edit an asset's value.
export async function saveMonthSnapshot(key: string, totals: NwTotals) {
  await setDoc(doc(db, 'users', uid(), 'netWorth', key), { ...totals, savedAt: new Date().toISOString() });
}
export function subscribeSnapshots(onChange: (s: Record<string, NwTotals>) => void) {
  return onSnapshot(collection(db, 'users', uid(), 'netWorth'), (s) => {
    const out: Record<string, NwTotals> = {};
    s.docs.forEach((d) => (out[d.id] = d.data() as NwTotals));
    onChange(out);
  });
}

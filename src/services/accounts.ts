import type { Account, NewAccount } from '@/types/account';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

// users/{uid}/accounts/{id}
function col() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'accounts');
}
export function subscribeAccounts(onChange: (a: Account[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(query(col(), orderBy('name')), (s) => onChange(s.docs.map((d) => ({ id: d.id, ...(d.data() as NewAccount) }))), onError);
}
export async function addAccount(a: NewAccount) {
  return (await addDoc(col(), { ...clean(a), createdAt: serverTimestamp() })).id;
}
export async function updateAccount(id: string, changes: Partial<NewAccount>) {
  await updateDoc(doc(col(), id), toUpdateData(changes));
}
export async function deleteAccount(id: string) {
  await deleteDoc(doc(col(), id));
}

// Check-in: "my bank app shows ₹X right now". Resets the starting point to today
// (later tagged entries still move it) and records the balance in history.
export async function checkIn(a: Account, balance: number, now = new Date()) {
  const { withCheckin } = await import('@/utils/accounts');
  await updateDoc(doc(col(), a.id), {
    opening: balance,
    openingDate: now.toISOString(),
    verifiedAt: now.toISOString(),
    checkins: withCheckin(a, balance, now),
  });
}

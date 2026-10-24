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

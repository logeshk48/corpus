import type { NewRealized, Realized } from '@/types/realized';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean } from './firestoreUtils';

// users/{uid}/realized/{id}
function col() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'realized');
}
export function subscribeRealized(onChange: (l: Realized[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(query(col(), orderBy('date', 'desc')), (s) => onChange(s.docs.map((d) => ({ id: d.id, ...(d.data() as NewRealized) }))), onError);
}
export const addRealized = async (r: NewRealized) => (await addDoc(col(), { ...clean(r), createdAt: serverTimestamp() })).id;
export const deleteRealized = (id: string) => deleteDoc(doc(col(), id));

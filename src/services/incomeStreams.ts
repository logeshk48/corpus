import type { IncomeStream, NewIncomeStream } from '@/types/incomeStream';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

// users/{uid}/incomeStreams/{streamId}
function streamsCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'incomeStreams');
}

// LIVE READ: all streams, alphabetical
export function subscribeIncomeStreams(
  onChange: (streams: IncomeStream[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(streamsCollection(), orderBy('name'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewIncomeStream) }))),
    onError
  );
}

export async function addIncomeStream(stream: NewIncomeStream): Promise<string> {
  const ref = await addDoc(streamsCollection(), {
    ...clean(stream),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateIncomeStream(id: string, changes: Partial<NewIncomeStream>) {
  await updateDoc(doc(streamsCollection(), id), toUpdateData(changes));
}

// Past income transactions keep their streamId; screens show them as "Unlinked"
export async function deleteIncomeStream(id: string) {
  await deleteDoc(doc(streamsCollection(), id));
}

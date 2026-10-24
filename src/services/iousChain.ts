import type { NewIou } from '@/types/iou';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean } from './firestoreUtils';

// Borrowed from A and gave it to B: two entries, saved together, pointing at each other
export async function addChain(borrowed: NewIou, lent: NewIou) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  const col = collection(db, 'users', uid, 'ious');
  const bRef = doc(col);
  const lRef = doc(col);
  const batch = writeBatch(db);
  batch.set(bRef, { ...clean(borrowed), linkedId: lRef.id, createdAt: serverTimestamp() });
  batch.set(lRef, { ...clean(lent), linkedId: bRef.id, createdAt: serverTimestamp() });
  await batch.commit();
}

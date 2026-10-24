import type { Iou, NewIou } from '@/types/iou';
import { remaining } from '@/utils/iou';
import { addDoc, collection, deleteDoc, deleteField, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

// users/{uid}/ious/{id}
function col() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'ious');
}

export function subscribeIous(onChange: (ious: Iou[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(col(), orderBy('date', 'desc')),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewIou) }))),
    onError
  );
}

export async function addIou(iou: NewIou) {
  const ref = await addDoc(col(), { ...clean(iou), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateIou(id: string, changes: Partial<NewIou>) {
  await updateDoc(doc(col(), id), toUpdateData(changes));
}

export async function deleteIou(id: string) {
  await deleteDoc(doc(col(), id));
}

// Record a payback (partial or full). Marks the entry settled when nothing is left.
export async function repay(iou: Iou, amount: number, when = new Date()) {
  const pay = Math.min(amount, remaining(iou));
  const repayments = [...(iou.repayments ?? []), { amount: pay, date: when.toISOString() }];
  const settled = remaining({ ...iou, repayments }) <= 0;
  await updateDoc(doc(col(), iou.id), {
    repayments,
    ...(settled ? { settledAt: when.toISOString() } : {}),
  });
}

// Undo "settled" (e.g. tapped by mistake): clears paybacks and the settled flag
export async function reopen(iou: Iou) {
  await updateDoc(doc(col(), iou.id), { repayments: deleteField(), settledAt: deleteField() });
}

// Interest-only payment: recorded separately, never reduces the amount owed
export async function payInterest(iou: Iou, amount: number, when = new Date()) {
  const interestPayments = [...(iou.interestPayments ?? []), { amount, date: when.toISOString() }];
  await updateDoc(doc(col(), iou.id), { interestPayments });
}

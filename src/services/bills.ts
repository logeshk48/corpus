import type { Bill, NewBill } from '@/types/bill';
import { dueDateIn, yearMonth } from '@/utils/bills';
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
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

function uid() {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error('Not signed in');
  return id;
}

// users/{uid}/bills/{billId}
const billsCol = () => collection(db, 'users', uid(), 'bills');

export function subscribeBills(onChange: (b: Bill[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(billsCol(), orderBy('dayOfMonth')),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewBill) }))),
    onError
  );
}

export async function addBill(bill: NewBill): Promise<string> {
  const ref = await addDoc(billsCol(), { ...clean(bill), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateBill(id: string, changes: Partial<NewBill>) {
  await updateDoc(doc(billsCol(), id), toUpdateData(changes));
}

// Past expenses that were logged from this bill stay in your history
export async function deleteBill(id: string) {
  await deleteDoc(doc(billsCol(), id));
}

// Record this month's payment as an expense — exactly once.
// The expense gets a fixed id (bill_<id>_<YYYY-MM>) and the bill remembers the month,
// both in ONE atomic batch, so a second run (or a second device) can't duplicate it.
export async function logBillForThisMonth(bill: Bill, now: Date = new Date()) {
  const ym = yearMonth(now);
  const due = dueDateIn(bill, now.getFullYear(), now.getMonth());
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'users', uid(), 'transactions'), `bill_${bill.id}_${ym}`), {
    type: 'expense',
    amount: bill.amount,
    category: bill.category,
    note: bill.name,
    date: due.toISOString(),
    recurringId: bill.id,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(billsCol(), bill.id), { lastLoggedMonth: ym });
  await batch.commit();
}

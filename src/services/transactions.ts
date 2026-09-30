import type { NewTransaction, Transaction } from '@/types/transaction';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// The signed-in user's transactions folder
function txCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'transactions');
}

// Firestore rejects `undefined` values, so drop empty optional fields
function clean<T extends object>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

// CREATE: returns the new transaction's id
export async function addTransaction(tx: NewTransaction): Promise<string> {
  const ref = await addDoc(txCollection(), {
    ...clean(tx),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// READ (once): transactions between two dates, newest first
export async function getTransactions(start: Date, end: Date): Promise<Transaction[]> {
  const q = query(
    txCollection(),
    where('date', '>=', start.toISOString()),
    where('date', '<', end.toISOString()),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as NewTransaction) }));
}

// UPDATE: change only the fields you pass
export async function updateTransaction(id: string, changes: Partial<NewTransaction>) {
  await updateDoc(doc(txCollection(), id), clean(changes));
}

// DELETE
export async function deleteTransaction(id: string) {
  await deleteDoc(doc(txCollection(), id));
}

// LIVE READ: calls onChange now, and again every time the data changes.
// Returns an "unsubscribe" function to stop listening.
export function subscribeTransactions(
  start: Date,
  end: Date,
  onChange: (txs: Transaction[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    txCollection(),
    where('date', '>=', start.toISOString()),
    where('date', '<', end.toISOString()),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as NewTransaction) })));
    },
    onError
  );
}
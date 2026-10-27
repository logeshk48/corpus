import type { NewTransaction, Transaction } from '@/types/transaction';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

// The signed-in user's transactions folder
function txCollection() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'transactions');
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
// READ ONE: a single transaction by id (null if it doesn't exist)
export async function getTransaction(id: string): Promise<Transaction | null> {
  const snap = await getDoc(doc(txCollection(), id));
  return snap.exists() ? { id: snap.id, ...(snap.data() as NewTransaction) } : null;
}

// UPDATE: change only the fields you pass.
// A field passed as `undefined` is REMOVED (e.g. clearing a note);
// fields you don't pass at all are left untouched.
export async function updateTransaction(id: string, changes: Partial<NewTransaction>) {
  await updateDoc(doc(txCollection(), id), toUpdateData(changes));
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

// RESTORE: put a deleted transaction back under its ORIGINAL id (used by Undo).
// Keeps its original createdAt if we have it, otherwise stamps a new one.
export async function restoreTransaction(id: string, tx: NewTransaction) {
  await setDoc(doc(txCollection(), id), {
    createdAt: serverTimestamp(),
    ...clean(tx),
  });
}


// INSTANT ADD: the id is created on the phone, so the entry shows (and can be undone)
// immediately, even on a slow connection. Firestore syncs it in the background.
export function addTransactionNow(tx: NewTransaction): string {
  const ref = doc(txCollection());
  setDoc(ref, { ...clean(tx), createdAt: serverTimestamp() }).catch((e) => console.error('Sync failed:', e));
  return ref.id;
}

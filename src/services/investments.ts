import type { Investment, NewInvestment } from '@/types/investment';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

// users/{uid}/investments/{id}
function col() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'investments');
}
export function subscribeInvestments(onChange: (l: Investment[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(query(col(), orderBy('startDate')), (s) => onChange(s.docs.map((d) => ({ id: d.id, ...(d.data() as NewInvestment) }))), onError);
}
export const addInvestment = async (h: NewInvestment) => (await addDoc(col(), { ...clean(h), createdAt: serverTimestamp() })).id;
export const updateInvestment = (id: string, c: Partial<NewInvestment>) => updateDoc(doc(col(), id), toUpdateData(c));
export const deleteInvestment = (id: string) => deleteDoc(doc(col(), id));

// "I put in more money" — raises both what you invested and what it's worth (not a gain)
export const addMoney = (h: Investment, amount: number, currentValue: number) =>
  updateInvestment(h.id, { invested: h.invested + amount, value: currentValue + amount, valueAt: new Date().toISOString() });

// "The value changed" — only the worth moves (that IS a gain or loss)
export const updateValue = (h: Investment, value: number) => updateInvestment(h.id, { value, valueAt: new Date().toISOString() });

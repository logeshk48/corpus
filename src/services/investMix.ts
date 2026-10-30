import { collection, doc, onSnapshot, orderBy, query, setDoc, limit } from 'firebase/firestore';
import { auth, db } from './firebase';

// users/{uid}/investMix/{YYYY-MM} — how investments were split each month (for the mix history)
export type MixSnap = { month: string; total: number; invested: number; byCls: Record<string, number>; at: string };
function col() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return collection(db, 'users', uid, 'investMix');
}
export const saveMix = (s: MixSnap) => setDoc(doc(col(), s.month), s, { merge: true });
export function subscribeMix(onChange: (l: MixSnap[]) => void) {
  return onSnapshot(query(col(), orderBy('month', 'desc'), limit(12)), (s) => onChange(s.docs.map((d) => d.data() as MixSnap).reverse()), () => onChange([]));
}

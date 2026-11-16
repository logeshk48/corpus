import type { Bill, NewBill } from '@/types/bill';
import { addDays, isDayPlan, isoDay, openDue, yearMonth, type Occurrence } from '@/utils/bills';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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

// What changes on the bill when its waiting payment is paid or skipped on `on`.
// A day-count plan starts its next cycle from the later of the due date and the day you paid
// (recharge early and the new plan queues up behind the old one; recharge late and it starts that day).
function moveOn(bill: Bill, occ: Occurrence, on: Date, skipped: boolean) {
  if (!isDayPlan(bill)) return { lastLoggedMonth: occ.key, lastSkippedMonth: skipped ? occ.key : deleteField() };
  const from = skipped || on < occ.date ? occ.date : on;
  const next = addDays(from, bill.everyDays!);
  return {
    lastLoggedMonth: yearMonth(on),
    lastSkippedMonth: skipped ? yearMonth(on) : deleteField(),
    nextDate: isoDay(next),
    dayOfMonth: next.getDate(),
    ...(skipped ? {} : { lastPaidDate: isoDay(on) }),
  };
}
// Put the bill back exactly as it was in `bill` (a copy taken before the change)
const asItWas = (bill: Bill) => ({
  lastLoggedMonth: bill.lastLoggedMonth ?? deleteField(),
  lastSkippedMonth: bill.lastSkippedMonth ?? deleteField(),
  ...(isDayPlan(bill) ? { nextDate: bill.nextDate, dayOfMonth: bill.dayOfMonth, lastPaidDate: bill.lastPaidDate ?? deleteField() } : {}),
});

// Record the waiting payment as an expense, exactly once.
// The expense gets a fixed id (bill_<id>_<payment key>) and the bill moves on to its next payment,
// both in ONE atomic batch, so a second run (or a second device) can't duplicate it.
// `amount` overrides the usual amount (variable bills). `paidOn` is the day the money left (default today).
export async function logBillForThisMonth(bill: Bill, amount: number = bill.amount, now: Date = new Date(), paidOn: Date = now) {
  const occ = openDue(bill, now);
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'users', uid(), 'transactions'), `bill_${bill.id}_${occ.key}`), {
    type: 'expense',
    amount,
    category: bill.category,
    note: bill.name,
    date: paidOn.toISOString(),
    recurringId: bill.id,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(billsCol(), bill.id), moveOn(bill, occ, paidOn, false));
  await batch.commit();
}

// "Not this time": move past the waiting payment without recording an expense
export async function skipBillThisMonth(bill: Bill, now: Date = new Date()) {
  await updateDoc(doc(billsCol(), bill.id), moveOn(bill, openDue(bill, now), now, true));
}

// Undo a skip: restore what the bill looked like before
export async function restoreBillState(bill: Bill) {
  await updateDoc(doc(billsCol(), bill.id), asItWas(bill));
}

// Undo a recorded payment: remove its expense and restore the bill.
// `bill` is the copy from before paying, so its waiting payment is the one that was paid.
export async function undoBillPayment(bill: Bill, now: Date = new Date()) {
  const batch = writeBatch(db);
  batch.delete(doc(collection(db, 'users', uid(), 'transactions'), `bill_${bill.id}_${openDue(bill, now).key}`));
  batch.update(doc(billsCol(), bill.id), asItWas(bill));
  await batch.commit();
}

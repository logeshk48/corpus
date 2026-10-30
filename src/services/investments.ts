import type { Investment, Lot, NewInvestment } from '@/types/investment';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';
import { addRealized } from './realized';
import { lotsOf } from '@/utils/corporateActions';
import { longAfterDays, taxClass } from '@/utils/capitalGains';

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

// Live-linked holdings (stocks / funds / NPS / crypto with units): trades change units, cost and lots.
// Lots = each purchase. Selling uses FIFO (oldest first), the way Indian tax counts it.
export { lotsOf };

export const buyUnits = (h: Investment, units: number, price: number, date = new Date().toISOString()) => {
  const u = (h.units ?? 0) + units;
  const lots = [...lotsOf(h), { date, units: round4(units), price }].sort((a, b) => (a.date < b.date ? -1 : 1));
  return updateInvestment(h.id, { units: round4(u), invested: Math.round(h.invested + units * price), value: Math.round(u * price), valueAt: new Date().toISOString(), lots, startDate: lots[0].date });
};

// Sell with FIFO cost. Long-term = lots held longer than the tax rule for this kind of asset.
// The sale is saved (users/{uid}/realized) so this year's tax and the ₹1.25 L exemption add up.
export const sellUnits = async (h: Investment, units: number, price: number, date = new Date()) => {
  const cls = taxClass(h);
  const after = cls ? longAfterDays(cls) : null;
  let left = units, cost = 0, shortGain = 0, longGain = 0;
  const lots: Lot[] = [];
  for (const l of lotsOf(h)) {
    const take = Math.min(left, l.units);
    if (take > 0) {
      const g = (price - l.price) * take;
      cost += l.price * take;
      if (after != null && date.getTime() - new Date(l.date).getTime() > after * 86_400_000) longGain += g;
      else shortGain += g;
      left -= take;
    }
    if (l.units - take > 0.00005) lots.push({ ...l, units: round4(l.units - take) });
  }
  const remaining = lots.reduce((a, l) => a + l.units, 0);
  await updateInvestment(h.id, {
    units: round4(remaining),
    invested: Math.round(lots.reduce((a, l) => a + l.units * l.price, 0)),
    value: Math.round(remaining * price),
    valueAt: new Date().toISOString(),
    lots,
    ...(lots[0] ? { startDate: lots[0].date } : {}),
  });
  const sold = units - Math.max(0, left);
  await addRealized({
    investmentId: h.id, name: h.name, cls: cls ?? 'other', date: date.toISOString(),
    units: round4(sold), sellPrice: price, cost: Math.round(cost), shortGain: Math.round(shortGain), longGain: Math.round(longGain),
  }).catch((e) => console.warn('Could not save sale record', e));
  return { profit: Math.round(shortGain + longGain), longProfit: Math.round(longGain) };
};
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

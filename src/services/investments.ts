import type { Investment, Lot, NewInvestment, Sip, SipEntry } from '@/types/investment';
import { liveRefOf, priceOn } from '@/utils/market';
import { backfillSip, type Instalment } from '@/utils/sip';
import { getNavHistory } from '@/utils/market';
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

// ─── SIPs ───
export const saveSip = (h: Investment, sip: Sip | null) => updateInvestment(h.id, { sip: sip ?? undefined });

// "Yes, it went through": buy units at that day's NAV / price (or just add the money for manual holdings)
export async function confirmSip(h: Investment, inst: Instalment, auto = false) {
  const day = inst.date.toISOString();
  const ref = liveRefOf(h);
  let entry: SipEntry = { month: inst.month, status: 'done', date: day, amount: inst.amount, ...(auto ? { auto: true } : {}) };
  if (ref && h.units != null) {
    let price: number | null = null;
    try {
      price = (await priceOn(ref, ymd(inst.date))).price;
    } catch {}
    if (!price && h.units) price = h.value / h.units; // offline: last known price
    if (!price) throw new Error('No price for that day yet');
    const units = ref.kind === 'stock' ? Math.floor(inst.amount / price) : Math.round((inst.amount / price) * 1000) / 1000;
    if (units > 0) await buyUnits(h, units, price, day);
    entry = { ...entry, units, price, amount: Math.round(units * price) || inst.amount };
  } else {
    await updateInvestment(h.id, { invested: h.invested + inst.amount, value: h.value + inst.amount, valueAt: new Date().toISOString() });
  }
  await updateInvestment(h.id, { sipLog: [...(h.sipLog ?? []).filter((l) => l.month !== inst.month), entry] });
  return entry;
}
export const skipSip = (h: Investment, inst: Instalment) =>
  updateInvestment(h.id, { sipLog: [...(h.sipLog ?? []).filter((l) => l.month !== inst.month), { month: inst.month, status: 'skipped', date: inst.date.toISOString(), amount: 0 }] });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Save a SIP that has been running since `since`, adding every past instalment at its real NAV.
// alreadyIncluded: your units already include them (from your app) → only log them, don't add units.
export async function saveSipWithHistory(h: Investment, sip: Sip, since: Date, alreadyIncluded: boolean) {
  const ref = liveRefOf(h);
  if (!ref || (ref.kind !== 'fund' && ref.kind !== 'nps')) throw new Error('Past SIPs need a mutual fund or NPS with a live NAV');
  const points = await getNavHistory(ref.kind, ref.id);
  const b = backfillSip(points, sip, since);
  const keepLog = (h.sipLog ?? []).filter((l) => !b.entries.some((e) => e.month === l.month));
  if (alreadyIncluded) {
    await updateInvestment(h.id, { sip: { ...sip, start: since.toISOString() }, sipLog: [...keepLog, ...b.entries] });
  } else {
    const lots = [...lotsOf(h), ...b.lots].sort((a, b2) => (a.date < b2.date ? -1 : 1));
    const units = round4((h.units ?? 0) + b.units);
    const unitPrice = h.units ? h.value / h.units : b.lots.length ? b.lots[b.lots.length - 1].price : 0;
    await updateInvestment(h.id, {
      sip: { ...sip, start: since.toISOString() },
      sipLog: [...keepLog, ...b.entries],
      lots,
      units,
      invested: Math.round(h.invested + b.invested),
      value: Math.round(units * unitPrice),
      valueAt: new Date().toISOString(),
      startDate: lots[0]?.date ?? h.startDate,
    });
  }
  return b;
}

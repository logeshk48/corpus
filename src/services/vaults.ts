import type { NewVault, NewVaultEntry, Vault, VaultEntry } from '@/types/vault';
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
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { clean, toUpdateData } from './firestoreUtils';

function uid() {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error('Not signed in');
  return id;
}

// users/{uid}/vaults/{vaultId}
const vaultsCol = () => collection(db, 'users', uid(), 'vaults');
// users/{uid}/vaultEntries/{entryId}
const entriesCol = () => collection(db, 'users', uid(), 'vaultEntries');

// ── Jars ───────────────────────────────────────────────────

export function subscribeVaults(onChange: (v: Vault[]) => void, onError?: (e: Error) => void) {
  return onSnapshot(
    query(vaultsCol(), orderBy('createdAt')),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewVault) }))),
    onError
  );
}

export async function addVault(vault: NewVault): Promise<string> {
  const ref = await addDoc(vaultsCol(), { ...clean(vault), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateVault(id: string, changes: Partial<NewVault>) {
  await updateDoc(doc(vaultsCol(), id), toUpdateData(changes));
}

// Deletes the jar AND its history in one atomic batch
export async function deleteVault(id: string) {
  const entries = await getDocs(query(entriesCol(), where('vaultId', '==', id)));
  const batch = writeBatch(db);
  entries.forEach((e) => batch.delete(e.ref));
  batch.delete(doc(vaultsCol(), id));
  await batch.commit();
}

// ── Money in / out ────────────────────────────────────────

export function subscribeVaultEntries(
  onChange: (e: VaultEntry[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    query(entriesCol(), orderBy('date', 'desc')),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewVaultEntry) }))),
    onError
  );
}

export async function addVaultEntry(entry: NewVaultEntry): Promise<string> {
  const ref = await addDoc(entriesCol(), { ...clean(entry), createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteVaultEntry(id: string) {
  await deleteDoc(doc(entriesCol(), id));
}

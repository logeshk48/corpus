import { deleteField } from 'firebase/firestore';

// For CREATE: Firestore rejects `undefined`, so drop empty optional fields
export function clean<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

// For UPDATE: a field passed as `undefined` is REMOVED from the document;
// fields not passed at all are left untouched.
export function toUpdateData<T extends object>(changes: T): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    data[key] = value === undefined ? deleteField() : value;
  }
  return data;
}

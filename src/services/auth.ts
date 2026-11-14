import {
    createUserWithEmailAndPassword,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth, db } from './firebase';

export async function signUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

// Sign out: also clear this account's phone notifications, so the next person on this phone
// never gets "Pay SBI ₹25,000" meant for someone else.
export async function logOut() {
  if (Platform.OS !== 'web') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch {}
  }
  await signOut(auth);
}

// Every collection Corpus keeps under users/{uid}. Keep in sync when adding a new one.
const USER_COLLECTIONS = [
  'transactions', 'accounts', 'assets', 'bills', 'incomeStreams', 'investMix', 'investments',
  'ious', 'netWorth', 'realized', 'settings', 'vaultEntries', 'vaults',
];

// Delete the account and everything in it, for good. Asks for the password again (Firebase requires a
// fresh sign-in for this), removes all data, then the login itself.
export async function deleteMyAccount(password: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Not signed in');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(collection(db, 'users', user.uid, name));
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  const root = writeBatch(db);
  root.delete(doc(db, 'users', user.uid));
  await root.commit();
  if (Platform.OS !== 'web') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch {}
  }
  await deleteUser(user);
}

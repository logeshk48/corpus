import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { auth } from './firebase';

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
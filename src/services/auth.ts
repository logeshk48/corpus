import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { auth } from './firebase';

export async function signUp(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logOut() {
  await signOut(auth);
}
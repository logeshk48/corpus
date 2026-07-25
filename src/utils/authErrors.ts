export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-email':
      return 'That email looks invalid';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    default:
      return 'Something went wrong. Please try again';
  }
}
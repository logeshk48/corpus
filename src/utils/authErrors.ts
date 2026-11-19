export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email already has an account. Sign in instead.';
    case 'auth/invalid-email':
      return 'Check the email address. It does not look right.';
    case 'auth/weak-password':
      return 'Use at least 6 characters for the password.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The email or password is wrong.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes, or reset your password.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return 'Could not sign in. Try again.';
  }
}
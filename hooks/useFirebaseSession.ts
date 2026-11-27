import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

type FirebaseClient = typeof import('../services/firebaseClient');
type AuthError = 'auth_failed' | 'auth_unavailable';
const enabled = Boolean(import.meta.env.VITE_FIREBASE_CONFIG) ||
  (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true');

export function useFirebaseSession() {
  const [client, setClient] = useState<FirebaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(enabled);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import('../services/firebaseClient').then(firebase => {
      if (!active) return;
      setClient(firebase);
      unsubscribe = firebase.onAuthStateChanged(firebase.auth, current => {
        if (!active) return;
        setUser(current);
        setChecking(false);
      });
      return firebase.getRedirectResult(firebase.auth);
    }).catch(() => {
      if (!active) return;
      setChecking(false);
      setError('auth_unavailable');
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function changeAuth(kind: 'sign-in' | 'sign-out') {
    if (!client || working || checking) return;
    setWorking(true);
    setError(null);
    try {
      if (kind === 'sign-in') {
        await client.signInWithGoogle();
      } else {
        await client.signOut(client.auth);
      }
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('auth_failed');
      }
    } finally {
      setWorking(false);
    }
  }

  return { enabled, client, user, checking, working, error, changeAuth };
}

export type FirebaseSession = ReturnType<typeof useFirebaseSession>;

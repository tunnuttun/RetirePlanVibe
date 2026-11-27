import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';

const emulated = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true';

function webConfig(): FirebaseOptions {
  if (emulated) {
    return {
      apiKey: 'demo-retireplan-key',
      appId: '1:123456789:web:retireplan',
      authDomain: 'localhost',
      projectId: 'demo-retireplan-vibe',
    };
  }

  const { apiKey, appId, authDomain, projectId } = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}');
  if (![apiKey, appId, authDomain, projectId].every(value => typeof value === 'string' && value)) {
    throw new Error('Firebase web configuration is incomplete');
  }
  const { hostname } = window.location;
  const defaultHostingDomain = hostname === `${projectId}.web.app` || hostname === `${projectId}.firebaseapp.com`;
  return { apiKey, appId, authDomain: defaultHostingDomain ? hostname : authDomain, projectId };
}

const config = webConfig();
const app = initializeApp(config);
export const projectId = app.options.projectId!;
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export { getRedirectResult, onAuthStateChanged, signOut };
export { savedSetsFor } from './savedSets';

if (emulated) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/popup-blocked' && !emulated && config.authDomain === window.location.hostname) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

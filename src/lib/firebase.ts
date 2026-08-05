/**
 * Firebase client — gracefully no-ops when VITE_FIREBASE_API_KEY is not set.
 * The rest of the app (plan generation, scraping, etc.) works without it.
 * Only Google sign-in is disabled when Firebase is unconfigured.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialise when the config is actually present.
const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

let _app:  FirebaseApp | null = null;
let _auth: Auth        | null = null;

if (isConfigured) {
  _app  = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  if (!_auth) throw new Error('Google Auth is not configured — add VITE_FIREBASE_* env vars.');
  const result = await signInWithPopup(_auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (_auth) await firebaseSignOut(_auth);
}

/** Subscribes to auth state. Returns a no-op unsubscribe if Firebase is unconfigured. */
export function onAuthStateChanged(cb: (user: User | null) => void): () => void {
  if (!_auth) { cb(null); return () => {}; }
  return firebaseOnAuthStateChanged(_auth, cb);
}

export { type User };

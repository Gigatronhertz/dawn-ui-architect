/**
 * Firebase client — gracefully no-ops when VITE_FIREBASE_API_KEY is not set.
 * The rest of the app (plan generation, scraping, etc.) works without it.
 * Only Google sign-in is disabled when Firebase is unconfigured.
 *
 * Sign-in strategy:
 *  1. Try signInWithPopup (fast, no page reload).
 *  2. On auth/network-request-failed or auth/popup-blocked (ad blockers, mobile
 *     browsers, strict privacy shields), fall back to signInWithRedirect.
 *     The caller stores the pending tripId in sessionStorage (msgo_pending_link)
 *     so the plan can be linked after the page reloads on return.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

/** Sign in via popup. Throws with err.code on failure — caller decides whether to redirect. */
export async function signInWithGoogle(): Promise<User> {
  if (!_auth) throw new Error('Google Auth is not configured — add VITE_FIREBASE_* env vars.');
  const result = await signInWithPopup(_auth, googleProvider);
  return result.user;
}

/**
 * Initiate a full-page redirect sign-in (bypasses ad blockers / popup blockers).
 * The page will navigate away — this promise never resolves.
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  if (!_auth) throw new Error('Google Auth is not configured — add VITE_FIREBASE_* env vars.');
  await signInWithRedirect(_auth, googleProvider);
}

/**
 * Must be called once on app load to resolve any pending redirect sign-in.
 * Returns the signed-in User if we just came back from a redirect, otherwise null.
 */
export async function resolveGoogleRedirect(): Promise<User | null> {
  if (!_auth) return null;
  try {
    const result = await getRedirectResult(_auth);
    return result?.user ?? null;
  } catch (err) {
    console.warn('[firebase] getRedirectResult error:', err);
    return null;
  }
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

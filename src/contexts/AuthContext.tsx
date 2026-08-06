/**
 * Auth context — backed by our own JWT stored in localStorage.
 * The JWT is issued by the backend /auth/google/callback after server-side
 * Google OAuth. No Firebase client SDK calls involved in the sign-in flow,
 * which means ad blockers can't interfere.
 *
 * Firebase client SDK (onAuthStateChanged) is kept for backwards compat but
 * the session.get() JWT is the source of truth for this context.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { session } from '@/lib/api';

// Minimal user shape — matches what the backend JWT contains
export type SessionUser = {
  uid:      string;
  email:    string;
  name:     string | null;
  picture:  string | null;
};

type AuthCtx = {
  user:       SessionUser | null;
  loading:    boolean;
  signOut:    () => void;
  getIdToken: () => string | null;
};

const AuthContext = createContext<AuthCtx | null>(null);

/** Decode the payload from a JWT string (no verification — backend already did that). */
function decodeJwt(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.uid || !payload?.email) return null;
    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { uid: payload.uid, email: payload.email, name: payload.name ?? null, picture: payload.picture ?? null };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: check for a token in the URL (just returned from OAuth redirect)
  // or fall back to whatever's in localStorage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      // Came back from /auth/google/callback — save and clean the URL
      session.save(urlToken);
      params.delete('token');
      params.delete('linked');
      const clean = [window.location.pathname, params.toString()].filter(Boolean).join('?');
      window.history.replaceState({}, '', clean);
    }

    const stored = session.get();
    if (stored) {
      const decoded = decodeJwt(stored);
      if (decoded) {
        setUser(decoded);
      } else {
        // Token expired or invalid — clear it
        session.clear();
      }
    }

    setLoading(false);
  }, []);

  function signOut() {
    session.clear();
    setUser(null);
  }

  function getIdToken(): string | null {
    return session.get();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { AuthSession } from "../lib/types";
import { guestLogin } from "../services/api";

const sessionKey = "movie-sync-session";

type AuthContextValue = {
  session: AuthSession | null;
  isSigningIn: boolean;
  signIn: (displayName: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function signIn(displayName: string) {
    setIsSigningIn(true);
    try {
      const nextSession = await guestLogin(displayName);
      localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
    } finally {
      setIsSigningIn(false);
    }
  }

  function signOut() {
    localStorage.removeItem(sessionKey);
    setSession(null);
  }

  const value = useMemo(() => ({ session, isSigningIn, signIn, signOut }), [session, isSigningIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

function loadSession(): AuthSession | null {
  const rawSession = localStorage.getItem(sessionKey);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

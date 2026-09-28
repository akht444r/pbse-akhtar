// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from 'react';
import { getActiveSession, setActiveSession, clearActiveSession, clearApiCaches, IDP_URL } from '../api/client';

// Display data only. The token is NOT hard-coded: it is requested from the identity
// provider at sign-in, so it is always signed by the key the service trusts and
// never expires unnoticed inside the source code.
// Keys and userIds must match PERSONAS in service/dev-idp.js.
export const PRESET_PERSONAS = {
  studentA: { key: 'studentA', name: 'Student A', role: 'student', userId: 'usr_studentA' },
  studentB: { key: 'studentB', name: 'Student B', role: 'student', userId: 'usr_studentB' },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // No session means signed out. Screens that need an identity are sent to /login by the API layer.
  const [session, setSessionState] = useState(() => getActiveSession());

  const signIn = async (personaKey) => {
    const persona = PRESET_PERSONAS[personaKey];
    if (!persona) throw new Error(`Unknown persona: ${personaKey}`);

    let res;
    try {
      res = await fetch(`${IDP_URL}/token?persona=${encodeURIComponent(personaKey)}`, { method: 'POST' });
    } catch {
      throw new Error('Cannot reach the sign-in service. Start it with "npm run idp" in the service folder.');
    }
    if (!res.ok) throw new Error('The sign-in service refused this account.');

    const { access_token: token } = await res.json();
    const next = { ...persona, token };
    clearApiCaches();
    setActiveSession(next);
    setSessionState(next);
  };

  const signOut = () => {
    clearApiCaches();
    clearActiveSession();
    setSessionState(null);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, personas: PRESET_PERSONAS }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

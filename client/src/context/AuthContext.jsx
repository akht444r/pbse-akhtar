// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getActiveSession, setActiveSession, clearActiveSession } from '../api/client';

export const PRESET_PERSONAS = {
  studentA: {
    key: 'studentA',
    name: 'Student A (Full Privileges)',
    role: 'student',
    userId: 'usr_studentA',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUgYm9va2luZ3M6Y2FuY2VsIiwiZmFjaWxpdHlfaWQiOiJmYWMtbWFpbiIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYW1wdXMtY291cnQubG9jYWwiLCJhdWQiOiJjYW1wdXMtY291cnQtYXBpIiwic3ViIjoidXNyX3N0dWRlbnRBIiwiaWF0IjoxNzkwNjE2MzQ5LCJleHAiOjE4MjIxNTIzNDl9.qGBTJLR0bKmEBbwY77plQTkx43wCsh_QqEZwCWSE_SBLSZsXjct5USW-SovsoiTEvcYPkSFdtd-ecczSQEiepQAYSl9KVKzBKSrX6tJTeyaVJf7tsLhUQMQFpi6S_s58lzTzHa30WMs4-GVfFUEho1N4CdI0ApQJc7xcMZfawxZQpDv-DRhwVQSVm_rKupm83LpNh2oH9hCdin2sCsAeCDu86mT2g0GT06zgYzbM07HY36QBR7o-iIgsaSE1qgxLcxTR_-6QDUF8MV9DUNRXN8dYJc4MK7X_1-pUfBfP82pq88giF6F31-daaFh2HDDtRYdPaKBkzSXY3mUqFlv1Yw',
    scopes: ['courts:read', 'bookings:read', 'bookings:write', 'bookings:cancel'],
  },
  studentB: {
    key: 'studentB',
    name: 'Student B (No Cancel Scope / Different Owner)',
    role: 'student',
    userId: 'usr_studentB',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUiLCJmYWNpbGl0eV9pZCI6ImZhYy1tYWluIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNhbXB1cy1jb3VydC5sb2NhbCIsImF1ZCI6ImNhbXB1cy1jb3VydC1hcGkiLCJzdWIiOiJ1c3Jfc3R1ZGVudEIiLCJpYXQiOjE3OTA2MTYzNDksImV4cCI6MTgyMjE1MjM0OX0.G3GqXF3c1vQup3XooWxJB86Q7Hhk1tRqtA21XxafsPyp8Gvy1kqHCxXMhjFNFAuApcC7qm8iQyYK1J-TA6vXFhQ6O78z5_Gq2Cpsv2gLSkRcm4NE9wGqUDWNPATRxAASckkd3ovHDh4yqRX6x4pKjMGNqr3Cfd3vT_iRjPciyevh1bjkv_cl1DVZ6qWLtJCetwvxx79wHy-31jAyhmALq46iwrNsgFxfZIbFfPxU9FatPVNtUrnD_ovjYnCrtrtjMCeSQQN1cA30kLtz-PPNBNWT6g1Vvk5etsnAAb5ML2pMZvVCOmB_E5ICxT4fuTzUDpNRqk6X6MpWKS22PwlJNA',
    scopes: ['courts:read', 'bookings:read', 'bookings:write'],
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getActiveSession());

  const signIn = (personaKey) => {
    const selected = PRESET_PERSONAS[personaKey];
    if (selected) {
      setActiveSession(selected);
      setSessionState(selected);
    }
  };

  const signOut = () => {
    clearActiveSession();
    setSessionState(null);
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, personas: PRESET_PERSONAS }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
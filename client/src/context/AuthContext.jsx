// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getActiveSession, setActiveSession, clearActiveSession } from '../api/client';

export const PRESET_PERSONAS = {
  studentA: {
    key: 'studentA',
    name: 'Student A (Full Privileges)',
    role: 'student',
    userId: 'usr_studentA',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUgYm9va2luZ3M6Y2FuY2VsIiwiZmFjaWxpdHlfaWQiOiJmYWMtbWFpbiIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYW1wdXMtY291cnQubG9jYWwiLCJhdWQiOiJjYW1wdXMtY291cnQtYXBpIiwic3ViIjoidXNyX3N0dWRlbnRBIiwiaWF0IjoxNzkwNDE5MDkxLCJleHAiOjE3OTMwMTEwOTF9.ZatCeHStmwU65RLZ-QrRc8zHzPipS5jXfUYkEPrxW3fGgyw7EhIIkkQQWuQuf2egMb-79dya8yPnGRvY9NxsaISC3x1Efu3626dvuJFNDZyQjmVliao7DRQQ6Rl1rYRHe0L5QPmdoqRfAJaHeEoICujeOV7Kb0eca4nG-NDAvle4dTMzrE4hWho4Kiie7Kp1jLH6hBA_x0fImuVrdwjhLSSx39XEtUIlBnL-o-aWwz6qNDZRHc3UowhiBwYuczsSR2FJ_Ap9ouTfaPTS8HyR2RDXznKGtkirIuf8Awbq8wnX0rDhQMjc4izG-clmglKaVKrUNl7rm7nQfx2_URIyRw',
    scopes: ['courts:read', 'bookings:read', 'bookings:write', 'bookings:cancel'],
  },
  studentB: {
    key: 'studentB',
    name: 'Student B (No Cancel Scope / Different Owner)',
    role: 'student',
    userId: 'usr_studentB',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUiLCJmYWNpbGl0eV9pZCI6ImZhYy1tYWluIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNhbXB1cy1jb3VydC5sb2NhbCIsImF1ZCI6ImNhbXB1cy1jb3VydC1hcGkiLCJzdWIiOiJ1c3Jfc3R1ZGVudEIiLCJpYXQiOjE3OTA0MTkwOTEsImV4cCI6MTc5MzAxMTA5MX0.NV9HH3RqK_c9kEhuV08krzAQGESWI9Lbs0mz0efd6xtFG4YqYuCI5lkFAnVN66fWemeZbSsfCTtaFRA78AOcfZuGDVBi73OV1W9EdTLLJL7FpOoKqCdBMnsi2ohTLxTDBs8KFjRWRFrz50AL0E-A7KdVcS33fVEHTtMc7XyeC6a1Ra3148ZAv5u4O6vPLp0_gl039d7_8nC32oJVCf7klLU99B2GV5Ac8WTc8DoOpJHLFmLzgTA2QGWj2K8F_ax4fx_tFsCwEPIwaNASf3hWjLaaSd4c02rqGDfewDsAbr7z510MTlcOXojnyZFAcMEIpQnq66Rl9VN9z4XHrqztHg',
    scopes: ['courts:read', 'bookings:read', 'bookings:write'],
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getActiveSession() || PRESET_PERSONAS.studentA);

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
// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getActiveSession, setActiveSession, clearActiveSession } from '../api/client';

export const PRESET_PERSONAS = {
  studentA: {
    key: 'studentA',
    name: 'Student A (Full Privileges)',
    role: 'student',
    userId: 'usr_studentA',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUgYm9va2luZ3M6Y2FuY2VsIiwiZmFjaWxpdHlfaWQiOiJmYWMtbWFpbiIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYW1wdXMtY291cnQubG9jYWwiLCJhdWQiOiJjYW1wdXMtY291cnQtYXBpIiwic3ViIjoidXNyX3N0dWRlbnRBIiwiaWF0IjoxNzkwNjA5NzIyLCJleHAiOjE4MjIxNDU3MjJ9.qnDi0sptWsD6CB2R4BtCu-jJXfGIdCH5gWw891oBhq9TtHTjSLKp5_mAl2opHY0_-226yVTfbL-tmkd03cRQ80bUWlPi2ZPCq3hQnCK6Wx7qHTVJcU2DyhL7I9u88JdTB1-rej-5JAMCs5Tq_ofqqfyOvS0Ui0A1ANCNBF0bGmyxYDRTf-_A-p-u-lzIUJC42xmsCzhvZDpcX7vLOQPMSERGtsR031TsHYlfNKXsG5hPzgJ_ruVTZv2nZ7FHM2M1vlAh3c-3ngd-WzR8bG4Qlc4aD0f7qqrX-bAqEHYuyClyiXErapVd0WhAsVVdrJlezDXnq8RtuFpwDkFQV14IJQ',
    scopes: ['courts:read', 'bookings:read', 'bookings:write', 'bookings:cancel'],
  },
  studentB: {
    key: 'studentB',
    name: 'Student B (No Cancel Scope / Different Owner)',
    role: 'student',
    userId: 'usr_studentB',
    token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImNhbXB1cy1jb3VydC10ZXN0LWtleSJ9.eyJzY29wZSI6ImNvdXJ0czpyZWFkIGJvb2tpbmdzOnJlYWQgYm9va2luZ3M6d3JpdGUiLCJmYWNpbGl0eV9pZCI6ImZhYy1tYWluIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNhbXB1cy1jb3VydC5sb2NhbCIsImF1ZCI6ImNhbXB1cy1jb3VydC1hcGkiLCJzdWIiOiJ1c3Jfc3R1ZGVudEIiLCJpYXQiOjE3OTA2MDk3MjIsImV4cCI6MTgyMjE0NTcyMn0.Xe9loiOBpa1tgdaJDILeEx0dfgw6NsOv9jjXpkhiov0cwJYOeiVf9yD-GkFdchOnYxl7exvykAHGsMYVQ4PFHCOR6YmC42OYrdbdXVze0pZ6--KhsE44LK88W2dd9yiNfScFWD609htyftFYyhdcZTWhJmziEXFP7hTXhDKTWvBzWnTsnwZvl-3AEq1NVdwq3ItgSqmG2WOYAMaPc9EFoNXZT9hHKQOe2FMqr03hyAwPP-CfF1Djf54XbfBrCbdgdZflh8sBWJfI_KZ-YFWOl6iQS4rlwPJ7VF85A6bEAhB55RbWUv2pbYRu1l1Apdn0jFl_HjoE3Hm7ibI3yD_GOg',
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
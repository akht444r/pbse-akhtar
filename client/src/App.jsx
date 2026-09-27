// client/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

function Navbar() {
  const { session, signIn, signOut, personas } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-black text-slate-900 text-lg tracking-tight">
            CampusCourt
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link to="/" className="text-slate-600 hover:text-blue-600 transition">
              Courts
            </Link>
          </nav>
        </div>

        {/* Identity & Persona Controls */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{session.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{session.userId}</div>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => signIn('studentA')}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
              >
                Sign in as Student A
              </button>
              <button
                onClick={() => signIn('studentB')}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded hover:bg-slate-900"
              >
                Sign in as Student B
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function LoginPage() {
  const { signIn, personas } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const returnTo = query.get('returnTo') || '/';

  const handleSelect = (key) => {
    signIn(key);
    navigate(returnTo);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-xl border border-slate-200">
      <h2 className="text-lg font-bold text-slate-900 mb-2">Sign In Required</h2>
      <p className="text-xs text-slate-500 mb-6">Select a synthetic test persona to continue to this view.</p>
      <div className="space-y-3">
        {Object.entries(personas).map(([key, p]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className="w-full p-3 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50/50 transition"
          >
            <div className="font-bold text-sm text-slate-800">{p.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">{p.userId}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
            <Routes>
              {/* Member 2 will connect the Court List & Detail pages here */}
              <Route path="/" element={<div className="p-6 bg-white rounded-xl border">Court Catalogue Placeholder (Member 2)</div>} />
              <Route path="/courts/:courtId" element={<div className="p-6 bg-white rounded-xl border">Court Detail Placeholder (Member 2)</div>} />
              
              {/* Member 3 will connect the Booking Form & Detail pages here */}
              <Route path="/courts/:courtId/book" element={<div className="p-6 bg-white rounded-xl border">Booking Form Placeholder (Member 3)</div>} />
              <Route path="/bookings/:bookingId" element={<div className="p-6 bg-white rounded-xl border">Booking Detail Placeholder (Member 3)</div>} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<div className="p-12 text-center text-slate-400">404 - Screen Not Found</div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CallProvider } from './contexts/CallContext';

// Pages
import AgreeContinuePage from './pages/AgreeContinuePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardLayout from './layouts/DashboardLayout';
import ChatsPage from './pages/ChatsPage';
import StatusPage from './pages/StatusPage';
import CallsPage from './pages/CallsPage';
import MemoryVaultPage from './pages/MemoryVaultPage';
import SettingsPage from './pages/SettingsPage';
import AccountsPage from './pages/AccountsPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user, loading, termsAccepted } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0c0d14] flex flex-col items-center justify-center text-slate-400">
        <div className="w-12 h-12 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-4" />
        <p className="text-xs tracking-wider uppercase text-rose-300 font-medium">Entering GOSH Sanctuary...</p>
      </div>
    );
  }

  // First time user must agree to terms
  if (!termsAccepted) {
    return <Navigate to="/agree" replace />;
  }

  // If not logged in, go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Guard (prevents logged in users from seeing login/agree)
const PublicRoute = ({ children }) => {
  const { user, loading, termsAccepted } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0c0d14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  // If already logged in, redirect to main chats
  if (user && termsAccepted) {
    return <Navigate to="/chats" replace />;
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <CallProvider>
          <Routes>
            {/* Entry Screen (WhatsApp Agree & Continue) */}
            <Route
              path="/agree"
              element={
                <PublicRoute>
                  <AgreeContinuePage />
                </PublicRoute>
              }
            />

            {/* Login & Signup */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            {/* Authenticated Dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/chats" replace />} />
              <Route path="chats" element={<ChatsPage />} />
              <Route path="status" element={<StatusPage />} />
              <Route path="calls" element={<CallsPage />} />
              <Route path="vault" element={<MemoryVaultPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
            </Route>

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
        </CallProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

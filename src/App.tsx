/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { auth } from './lib/firebase';
import { XCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import FlashReport from './components/FlashReport';
import NotificationManager from './components/NotificationManager';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (profile?.status === 'SUSPENDED') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Cuenta Suspendida</h1>
        <p className="text-slate-400 max-w-sm">Tu acceso a AutoRed ha sido restringido por un administrador. Si crees que esto es un error, contacta a soporte.</p>
        <button onClick={() => auth.signOut()} className="mt-8 text-sm font-bold text-brand-primary hover:underline">Cerrar Sesión</button>
      </div>
    );
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">Cargando...</div>;
  if (profile?.role !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-hidden relative">
        {children}
        <FlashReport />
        <NotificationManager />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute>
              <MainLayout>
                <MapView />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute>
                <MainLayout>
                  <AdminDashboard />
                </MainLayout>
              </AdminRoute>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

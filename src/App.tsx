/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import BottomNavbar from './components/BottomNavbar';
import { TabType } from './lib/navigation';

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

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">Cargando...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white">Cargando...</div>;
  if (profile?.role !== 'ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

import InteractiveNetworkWeb from './components/InteractiveNetworkWeb';
import CommandPalette from './components/CommandPalette';

interface MainLayoutProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onTriggerAlert: () => void;
  children: React.ReactNode;
}

function MainLayout({ activeTab, setActiveTab, onTriggerAlert, children }: MainLayoutProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  React.useEffect(() => {
    const handleOpenPalette = () => setIsPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpenPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenPalette);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-950 tactical-bg text-slate-100 overflow-hidden relative">
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onTriggerAlert={onTriggerAlert} />
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto pb-28 md:pb-0">
            {children}
          </div>
          <FlashReport />
          <NotificationManager />
          <CommandPalette
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
            setActiveTab={setActiveTab}
          />
        </main>
        <BottomNavbar activeTab={activeTab} setActiveTab={setActiveTab} onTriggerAlert={onTriggerAlert} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('PANEL');

  const handleTriggerAlert = () => {
    window.dispatchEvent(new CustomEvent('open-flash-report'));
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onTriggerAlert={handleTriggerAlert}
              >
                <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute>
              <MainLayout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onTriggerAlert={handleTriggerAlert}
              >
                <MapView />
              </MainLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminRoute>
                <MainLayout
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onTriggerAlert={handleTriggerAlert}
                >
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

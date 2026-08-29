import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, User, Bell, BellOff, LogOut, Search, Command } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { NAV_ITEMS, TabType } from '../lib/navigation';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onTriggerAlert: () => void;
}

export default function Navbar({ activeTab, setActiveTab, onTriggerAlert }: NavbarProps) {
  const { profile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (location.pathname !== '/') navigate('/');
  };

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === 'ADMIN');

  return (
    <header className="sticky top-0 z-50 bg-slate-950 backdrop-blur-xl border-b border-slate-800 shadow-lg shadow-black/20">
      {/* Primary Top Header */}
      <div className="px-4 md:px-8 h-[64px] min-h-[64px] flex items-center justify-between gap-3">
        {/* Left: User Profile Badge & Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{profile?.displayName || 'Usuario'}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{profile?.role || 'Miembro'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Brand Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <img
            src="/branding/logo-alerta-dealers.png"
            alt="Alerta Dealers"
            className="h-8 sm:h-9 w-auto"
          />
          <span className="text-slate-300 font-mono text-xs px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-600 hidden sm:inline">COQUIMBO</span>
        </NavLink>

        {/* Right: Search Cmd+K, Notifications & Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition active:scale-95"
            title="Búsqueda rápida y comandos (Cmd + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-xs font-mono hidden md:inline">Comandos</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
              ⌘K
            </kbd>
          </button>
          {profile?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-600 text-slate-300 hover:bg-slate-500/10 active:scale-95 transition-all md:hidden"
              title="Panel de Administración"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleNotifications}
            className={`p-2.5 rounded-xl border transition-all relative active:scale-95 ${
              notificationsEnabled
                ? 'bg-slate-900 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={notificationsEnabled ? 'Notificaciones en Tiempo Real Activadas' : 'Notificaciones Silenciadas'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => auth.signOut()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desktop Primary Navigation */}
      <nav className="hidden md:flex items-center gap-1 px-4 md:px-8 border-t border-white/5">
        {visibleItems.map((item) => {
          const Icon = item.icon;

          if (item.alert) {
            return (
              <button
                key={item.id}
                onClick={onTriggerAlert}
                className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
                title="Disparar Alerta Máxima"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          }

          if (item.path) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                    isActive
                      ? 'bg-slate-500/10 text-slate-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.tab!)}
              className={`flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                location.pathname === '/' && activeTab === item.tab
                  ? 'bg-slate-500/10 text-slate-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
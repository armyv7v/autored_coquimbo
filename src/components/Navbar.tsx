import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, LogOut, Shield, User, Menu, X, Bell, BellOff, AlertTriangle, ShieldAlert, Car, Route, ShieldCheck, Database } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { profile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const navigate = useNavigate();

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-b border-brand-primary/20 shadow-2xl shadow-black/80">
      {/* Primary Top Header */}
      <div className="px-4 md:px-8 h-[64px] min-h-[64px] flex items-center justify-between">
        {/* Left: User Profile Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.06] border border-white/12 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-primary to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left pr-1.5 hidden xs:block">
              <p className="text-xs font-bold text-slate-100 leading-tight">{profile?.displayName || 'Usuario'}</p>
              <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">{profile?.role || 'Miembro'}</p>
            </div>
          </div>
        </div>

        {/* Center: Brand Logo */}
        <NavLink to="/" className="flex flex-col items-center group">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-primary/15 border border-brand-primary/40 flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform shadow-md shadow-brand-primary/25">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-black text-base md:text-xl tracking-tight font-display text-white">
              AUTOMOTORAS <span className="text-brand-primary">EN RED</span>
            </span>
          </div>
        </NavLink>

        {/* Right: Notifications & Logout */}
        <div className="flex items-center gap-2">
          {profile?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-2xl bg-brand-primary/15 border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/25 active:scale-95 transition-all"
              title="Panel de Administración"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-2xl border transition-all relative active:scale-95 ${
              notificationsEnabled 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-md shadow-emerald-950/40' 
                : 'bg-slate-800/80 border-white/10 text-slate-400 hover:bg-slate-800'
            }`}
            title={notificationsEnabled ? 'Notificaciones en Tiempo Real Activadas' : 'Notificaciones Silenciadas'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => auth.signOut()}
            className="p-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}


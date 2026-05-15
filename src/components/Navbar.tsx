import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, LogOut, ShieldAlert, Shield } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { profile } = useAuth();

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 h-16 flex items-center justify-between z-50">
      <div className="flex items-center gap-3">
        <div className="bg-brand-primary p-2 rounded-lg">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl hidden md:block">AutoRed <span className="text-brand-primary">Coquimbo</span></span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium">Panel</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
            <MapIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Mapa</span>
          </NavLink>
          {profile?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${isActive ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Admin</span>
            </NavLink>
          )}
        </div>

        <div className="h-8 w-px bg-slate-800"></div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-100">{profile?.displayName || 'Usuario'}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{profile?.role || 'Visitante'}</p>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

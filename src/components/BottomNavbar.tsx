import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, ShieldAlert, Activity, History } from 'lucide-react';

export type TabType = 'PANEL' | 'FEED' | 'HISTORIAL';

interface BottomNavbarProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  onTriggerAlert?: () => void;
}

export default function BottomNavbar({ activeTab = 'PANEL', setActiveTab, onTriggerAlert }: BottomNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (tab: TabType) => {
    if (setActiveTab) setActiveTab(tab);
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-end justify-around shadow-2xl shadow-black select-none">
      {/* 1. PANEL */}
      <button
        onClick={() => handleTabClick('PANEL')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
          location.pathname === '/' && activeTab === 'PANEL'
            ? 'text-brand-primary font-black scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[9px] uppercase tracking-wider font-bold">Panel</span>
      </button>

      {/* 2. MAPA */}
      <NavLink
        to="/map"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
            isActive ? 'text-brand-primary font-black scale-105' : 'text-slate-400 hover:text-slate-200'
          }`
        }
      >
        <MapIcon className="w-5 h-5" />
        <span className="text-[9px] uppercase tracking-wider font-bold">Mapa</span>
      </NavLink>

      {/* 3. ALERTA MÁXIMA (Sobresaliente con Semicírculo en el Centro) */}
      <div className="relative flex flex-col items-center justify-center -mt-7 z-10 px-2">
        {/* Semicírculo de fondo que abraza el botón */}
        <div className="absolute -top-3 w-16 h-10 bg-slate-950 border-t border-x border-red-500/30 rounded-t-full shadow-2xl shadow-red-950/50 -z-10" />

        <button
          onClick={() => {
            if (onTriggerAlert) onTriggerAlert();
          }}
          className="group flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
          title="Disparar Alerta Máxima"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-0.5 shadow-2xl shadow-red-600/60 border-2 border-slate-950 animate-pulse flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-red-600 flex items-center justify-center text-white">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
          </div>
          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest mt-1 drop-shadow">
            Alerta
          </span>
        </button>
      </div>

      {/* 4. FEED */}
      <button
        onClick={() => handleTabClick('FEED')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
          location.pathname === '/' && activeTab === 'FEED'
            ? 'text-brand-primary font-black scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Activity className="w-5 h-5" />
        <span className="text-[9px] uppercase tracking-wider font-bold">Feed</span>
      </button>

      {/* 5. HISTORIAL DE EVENTOS */}
      <button
        onClick={() => handleTabClick('HISTORIAL')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all active:scale-95 ${
          location.pathname === '/' && activeTab === 'HISTORIAL'
            ? 'text-brand-primary font-black scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <History className="w-5 h-5" />
        <span className="text-[9px] uppercase tracking-wider font-bold">Historial</span>
      </button>
    </nav>
  );
}

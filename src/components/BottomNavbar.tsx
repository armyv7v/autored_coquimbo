import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NAV_ITEMS, TabType } from '../lib/navigation';

export type { TabType } from '../lib/navigation';

interface BottomNavbarProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  onTriggerAlert?: () => void;
}

export default function BottomNavbar({ activeTab = 'PANEL', setActiveTab, onTriggerAlert }: BottomNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleTabClick = (tab: TabType) => {
    if (setActiveTab) setActiveTab(tab);
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-end justify-around shadow-2xl shadow-black select-none">
      {NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === 'ADMIN').map((item) => {
        const Icon = item.icon;

        if (item.alert) {
          return (
            <div key={item.id} className="relative flex flex-col items-center justify-center -mt-7 z-10 px-2">
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
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <span className="text-[11px] font-black text-red-400 uppercase tracking-widest mt-1 drop-shadow">
                  {item.label}
                </span>
              </button>
            </div>
          );
        }

        if (item.path) {
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all active:scale-95 ${
                  isActive ? 'text-brand-primary font-black scale-105' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] uppercase tracking-wider font-bold">{item.label}</span>
            </NavLink>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.tab!)}
            className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all active:scale-95 ${
              location.pathname === '/' && activeTab === item.tab
                ? 'text-brand-primary font-black scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[11px] uppercase tracking-wider font-bold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
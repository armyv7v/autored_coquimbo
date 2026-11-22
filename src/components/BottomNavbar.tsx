import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, TabType } from '../lib/navigation';
import { useLongPress } from '../hooks/useLongPress';

export type { TabType } from '../lib/navigation';

interface BottomNavbarProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  onTriggerAlert?: (armed?: boolean) => void;
}

export default function BottomNavbar({ activeTab = 'PANEL', setActiveTab, onTriggerAlert }: BottomNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (tab: TabType) => {
    if (setActiveTab) setActiveTab(tab);
    if (location.pathname !== '/') navigate('/');
  };

  // N-D1: el tap abre el sheet sin armar la cuenta regresiva; mantener
  // presionado 1,5 s la arma directamente (gesto deliberado del operador).
  const alertLongPress = useLongPress({
    durationMs: 1500,
    onComplete: () => onTriggerAlert?.(true),
  });

  return (
    <nav
      className="sliding-tabs fixed bottom-0 inset-x-0 z-50 md:hidden bg-slate-950 backdrop-blur-2xl border-t border-white/10 px-2 pt-2 flex items-end justify-around shadow-2xl shadow-black/30 select-none"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* El acceso Admin vive en el botón del header (móvil) y en la nav de
          escritorio: con 6 ítems el sexto quedaba fuera del viewport en
          teléfonos de 360-375px. */}
      {NAV_ITEMS.filter((item) => !item.adminOnly).map((item) => {
        const Icon = item.icon;

        // Coincidencia exacta: los paths de NAV_ITEMS son rutas top-level
        // sin prefijos anidados, así que equivale al isActive de NavLink y
        // permite colocar data-active (el ancla de la píldora deslizante).
        const routeActive = !!item.path && location.pathname === item.path;

        if (item.alert) {
          return (
            <div key={item.id} className="relative flex flex-col items-center justify-center -mt-7 z-10 px-2">
              <div className="absolute -top-3 w-16 h-10 bg-slate-950 border-t border-x border-red-500/20 rounded-t-full shadow-2xl shadow-red-950/30 -z-10" />

              <button
                {...alertLongPress.handlers}
                onClick={(e) => {
                  // Long-press completado: el click de soltar no re-abre sin armar.
                  alertLongPress.guardClick(e);
                  if (onTriggerAlert) onTriggerAlert();
                }}
                className="group flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer touch-none"
                title="Mantén presionado para armar la Alerta Máxima"
              >
                <div
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-700 to-red-500 p-0.5 shadow-lg shadow-red-900/40 border-2 border-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform"
                  aria-label="Alerta máxima"
                >
                  <div className="w-full h-full rounded-full bg-red-600 flex items-center justify-center text-white">
                    <Icon className="w-7 h-7 text-white" weight="fill" />
                  </div>
                </div>
                <span className="text-[11px] font-black text-red-400 uppercase tracking-widest mt-1 drop-shadow">
                  {item.label}
                </span>
              </button>
            </div>
          );
        }

        // El fondo activo lo pinta la píldora deslizante del contenedor
        // (::before anclado a data-active, ver index.css); el item solo
        // aporta texto/escala. El fondo estático del fallback también vive
        // en el CSS (@supports not position-anchor).
        const activeClass = 'text-slate-100 font-black scale-105';

        if (item.path) {
          return (
            <NavLink
              key={item.id}
              to={item.path}
              data-active={routeActive ? 'true' : undefined}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 border border-transparent ${
                routeActive ? activeClass : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" weight={routeActive ? 'fill' : 'duotone'} />
              <span className="text-[11px] uppercase tracking-wider font-bold">{item.label}</span>
            </NavLink>
          );
        }

        const isCurrentActive = location.pathname === '/' && activeTab === item.tab;

        return (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.tab!)}
            data-active={isCurrentActive ? 'true' : undefined}
            aria-current={isCurrentActive ? 'true' : undefined}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 border border-transparent ${
              isCurrentActive ? activeClass : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" weight={isCurrentActive ? 'fill' : 'duotone'} />
            <span className="text-[11px] uppercase tracking-wider font-bold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
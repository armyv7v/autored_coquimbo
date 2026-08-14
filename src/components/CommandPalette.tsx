import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, Route, ShieldCheck, Car, Flame, Map, Radio, Command, ArrowRight, X, Building2, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, limit, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TabType } from '../lib/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab?: (tab: TabType) => void;
}

interface CommandAction {
  id: string;
  category: 'ACTIONS' | 'NAVIGATION' | 'DEALERSHIP' | 'INCIDENT';
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
  perform: () => void;
}

export default function CommandPalette({ isOpen, onClose, setActiveTab }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dealerships, setDealerships] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for Dealerships and Incidents
  useEffect(() => {
    if (!isOpen) return;

    const unsubDealers = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
      setDealerships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(15));
    const unsubIncidents = onSnapshot(qIncidents, (snapshot) => {
      setRecentIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubDealers();
      unsubIncidents();
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown handler for Palette (Cmd+K or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Static Operational Commands
  const baseActions: CommandAction[] = [
    {
      id: 'act-report',
      category: 'ACTIONS',
      title: 'Reportar Sospechoso / Asalto',
      subtitle: 'Emitir alerta de seguridad inmediata a la red',
      icon: ShieldAlert,
      badge: 'Alerta',
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-incident-report'));
        onClose();
      }
    },
    {
      id: 'act-roadtest',
      category: 'ACTIONS',
      title: 'Iniciar Prueba en Ruta (Test Drive)',
      subtitle: 'Captura guiada de RUT y vehículo antes de salir',
      icon: Route,
      badge: 'Salida',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-road-test'));
        onClose();
      }
    },
    {
      id: 'act-inspection',
      category: 'ACTIONS',
      title: 'Alerta de Fiscalización',
      subtitle: 'Avisar presencia de SII, Seremi, Carabineros o Trabajo',
      icon: ShieldCheck,
      badge: 'Control',
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-inspection'));
        onClose();
      }
    },
    {
      id: 'act-stock',
      category: 'ACTIONS',
      title: 'Consultar Stock e Inventario en Red',
      subtitle: 'Revisar vehículos disponibles en la zona',
      icon: Car,
      badge: 'Inventario',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-stock'));
        onClose();
      }
    },
    {
      id: 'act-digest',
      category: 'ACTIONS',
      title: 'Minuta Ejecutiva / Resumen WhatsApp',
      subtitle: 'Generar reporte de seguridad para Directorio y Gerencia',
      icon: FileText,
      badge: 'Ejecutivo',
      color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/30',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-executive-digest'));
        onClose();
      }
    },
    {
      id: 'act-flash',
      category: 'ACTIONS',
      title: 'Disparar Alerta Máxima Flash',
      subtitle: 'Notificación prioritaria a todas las automotoras',
      icon: Flame,
      badge: 'Crítico',
      color: 'text-red-500 bg-red-600/20 border-red-500/40',
      perform: () => {
        window.dispatchEvent(new CustomEvent('open-flash-report'));
        onClose();
      }
    },
    {
      id: 'nav-map',
      category: 'NAVIGATION',
      title: 'Ir al Mapa Táctico Satelital',
      subtitle: 'Visualización de telemetría y automotoras en vivo',
      icon: Map,
      badge: 'Vista',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      perform: () => {
        if (setActiveTab) setActiveTab('MAPA');
        navigate('/map');
        onClose();
      }
    },
    {
      id: 'nav-feed',
      category: 'NAVIGATION',
      title: 'Ver Feed de Inteligencia',
      subtitle: 'Historial y análisis de incidentes de seguridad',
      icon: Radio,
      badge: 'Vista',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      perform: () => {
        if (setActiveTab) setActiveTab('FEED');
        navigate('/');
        onClose();
      }
    }
  ];

  // Dynamic Dealership Commands
  const dealerActions: CommandAction[] = dealerships.map(d => ({
    id: `dealer-${d.id}`,
    category: 'DEALERSHIP',
    title: d.name || 'Automotora',
    subtitle: `Nodo de red • ${d.status === 'online' ? 'Online' : 'Conectado'} en Coquimbo/La Serena`,
    icon: Building2,
    badge: d.status === 'online' ? 'Online' : 'Nodo',
    color: d.status === 'online' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-400 bg-slate-800 border-slate-700',
    perform: () => {
      if (setActiveTab) setActiveTab('MAPA');
      navigate('/map');
      onClose();
    }
  }));

  // Dynamic Incident Commands
  const incidentActions: CommandAction[] = recentIncidents.map(inc => ({
    id: `incident-${inc.id}`,
    category: 'INCIDENT',
    title: `[${inc.type || 'ALERTA'}] ${inc.description?.slice(0, 45) || 'Sin descripción'}...`,
    subtitle: `Incidente registrado • Estado: ${inc.status || 'OPEN'}`,
    icon: AlertCircle,
    badge: inc.type || 'Evento',
    color: inc.type === 'ROBO' ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    perform: () => {
      if (setActiveTab) setActiveTab('FEED');
      navigate('/');
      onClose();
    }
  }));

  // Filtered List
  const queryText = search.trim().toLowerCase();
  const allActions = [...baseActions, ...dealerActions, ...incidentActions];
  const filteredActions = queryText
    ? allActions.filter(a => 
        a.title.toLowerCase().includes(queryText) || 
        a.subtitle.toLowerCase().includes(queryText) ||
        a.badge?.toLowerCase().includes(queryText)
      )
    : baseActions;

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[3500] flex items-start justify-center pt-16 sm:pt-24 bg-slate-950/80 backdrop-blur-md p-4"
        >
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[75vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escribe una acción, patente, automotora o módulo (ej: 'test drive', 'sii', 'robo')..."
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none font-medium"
              />
              {search ? (
                <button onClick={() => setSearch('')} className="p-1 text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-left">
              {filteredActions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Command className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No se encontraron resultados para &ldquo;{search}&rdquo;</p>
                  <p className="text-xs text-slate-600 mt-1">Prueba buscando por tipo de incidente o nombre de automotora</p>
                </div>
              ) : (
                filteredActions.map((action, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.perform}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left ${
                        isSelected
                          ? 'bg-slate-800/90 border border-brand-primary/40 shadow-sm'
                          : 'bg-transparent border border-transparent hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg border ${action.color} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-100 truncate">{action.title}</p>
                            {action.badge && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{action.subtitle}</p>
                        </div>
                      </div>
                      <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-brand-primary translate-x-0.5' : 'text-slate-600'}`} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Help */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/70 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↓</kbd>
                  Navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↵</kbd>
                  Ejecutar
                </span>
              </div>
              <span className="hidden sm:inline text-slate-500">AutoRed Coquimbo Command v2.0</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

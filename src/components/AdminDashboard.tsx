import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Users, Tray, ChartBar, Scan, DownloadSimple, CaretLeft, Eye, ShieldCheck, ShieldWarning, Shield, Clock, Pulse, SealCheck, XCircle, Warning, MagnifyingGlass, Funnel, CaretRight, Path, Spinner } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import ConnectionBanner from './ConnectionBanner';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

// Sparkline de KPI: mini AreaChart sin ejes para las tarjetas de estadísticas.
function MiniSpark({ data, color }: { data: { v: number }[]; color: string }) {
  const id = `spark-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
import AdminAccessRequests from './AdminAccessRequests';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OWNER' | 'SECURITY';
  status: 'ACTIVE' | 'SUSPENDED';
  dealershipId?: string | null;
  createdAt: any;
}

interface Incident {
  type: string;
  status: string;
  // Campos de la métrica de calidad del OCR (los escribe IncidentReportForm)
  plate?: string;
  plateSource?: 'OCR' | 'MANUAL';
  ocrConfidence?: number;
  ocrSuggestedPlate?: string;
  stolenCheckStatus?: 'STOLEN' | 'CLEAN' | 'UNKNOWN';
}

interface RoadTestDoc {
  id: string;
  dealershipId?: string;
  reporterId?: string;
  vehiclePlate?: string;
  notes?: string;
  status?: string;
  createdAt?: any;
}

interface InspectionAlertDoc {
  id: string;
  agencies?: string[];
  message?: string;
  dealershipId?: string;
  createdAt?: any;
}

interface DealershipDoc {
  id: string;
  name?: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dealerships, setDealerships] = useState<DealershipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STATS' | 'USERS' | 'REQUESTS' | 'OPS'>('STATS');
  const [roadTests, setRoadTests] = useState<RoadTestDoc[]>([]);
  const [inspectionAlerts, setInspectionAlerts] = useState<InspectionAlertDoc[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  // N-S9: un fallo de Firestore no puede leerse como "sin registros aún".
  const [dbOffline, setDbOffline] = useState(false);

  // MagnifyingGlass & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'OWNER' | 'SECURITY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (!profile || profile.role !== 'ADMIN') return;

    // Fetch Users
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setDbOffline(false);
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      },
      (err) => {
        console.error('Admin users error:', err);
        setDbOffline(true);
      }
    );

    // Fetch Incidents for Stats
    const unsubIncidents = onSnapshot(
      collection(db, 'incidents'),
      (snapshot) => {
        setDbOffline(false);
        setIncidents(snapshot.docs.map(doc => doc.data() as Incident));
        setLoading(false);
      },
      (err) => {
        console.error('Admin incidents error:', err);
        setDbOffline(true);
        setLoading(false);
      }
    );

    // Fetch pending access requests count
    const unsubRequests = onSnapshot(
      collection(db, 'accessRequests'),
      (snapshot) => {
        const count = snapshot.docs.filter(doc => doc.data()?.status === 'PENDING').length;
        setPendingCount(count);
      },
      (err) => {
        console.error('Admin accessRequests error:', err);
        setDbOffline(true);
      }
    );

    // Sedes reales para la métrica (A-27: antes era un "12" hardcodeado)
    const unsubDealerships = onSnapshot(
      collection(db, 'dealerships'),
      (snapshot) => {
        setDealerships(snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data() as any)?.name })));
      },
      (err) => {
        console.error('Admin dealerships error:', err);
        setDbOffline(true);
      }
    );

    // Registros operativos: test drives y avisos de fiscalización (antes
    // colecciones huérfanas: se escribían y nadie las leía).
    const unsubRoadTests = onSnapshot(
      query(collection(db, 'roadTests'), orderBy('createdAt', 'desc'), limit(30)),
      (snapshot) => {
        setRoadTests(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<RoadTestDoc, 'id'>) })));
      },
      (err) => {
        console.error('Admin roadTests error:', err);
        setDbOffline(true);
      }
    );
    const unsubInspections = onSnapshot(
      query(collection(db, 'inspectionAlerts'), orderBy('createdAt', 'desc'), limit(30)),
      (snapshot) => {
        setInspectionAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<InspectionAlertDoc, 'id'>) })));
      },
      (err) => {
        console.error('Admin inspectionAlerts error:', err);
        setDbOffline(true);
      }
    );

    return () => {
      unsubUsers();
      unsubIncidents();
      unsubRequests();
      unsubDealerships();
      unsubRoadTests();
      unsubInspections();
    };
  }, [profile]);

  const runUserAction = async (label: string, action: () => Promise<void>) => {
    setActionError(null);
    setActionOk(null);
    try {
      await action();
      setActionOk(label);
      setTimeout(() => setActionOk(null), 3000);
    } catch (error) {
      console.error('Admin user action error:', error);
      setActionError('No se pudo actualizar el usuario. Revisa tu conexión e intenta de nuevo.');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    runUserAction(`Rol actualizado a ${newRole}`, () => updateDoc(doc(db, 'users', userId), { role: newRole }));
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    runUserAction(
      newStatus === 'SUSPENDED' ? 'Usuario suspendido' : 'Usuario reactivado',
      () => updateDoc(doc(db, 'users', userId), { status: newStatus })
    );
  };

  if (!profile || profile.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <ShieldWarning className="w-16 h-16 mb-4 opacity-20" />
        <h1 className="text-xl font-black uppercase tracking-widest">Acceso Denegado</h1>
        <p className="text-xs">Solo administradores autorizados pueden ver esta sección.</p>
      </div>
    );
  }

  // Aggregate Stats
  const statsByType = incidents.reduce((acc: any, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {});

  // Calidad del reconocimiento de patentes: los campos plateSource /
  // ocrConfidence / ocrSuggestedPlate los escribe el formulario de incidentes
  // (plateSource pasa a MANUAL si el operador corrige algo del autollenado).
  const platedIncidents = incidents.filter(i => Boolean(i.plate));
  const ocrIncidents = platedIncidents.filter(i => i.plateSource === 'OCR' || (!i.plateSource && i.ocrConfidence != null));
  const manualIncidents = platedIncidents.filter(i => i.plateSource === 'MANUAL');
  // Corrección = el OCR sugirió una patente y el documento final quedó con otra.
  const ocrCorrections = incidents.filter(i => Boolean(i.ocrSuggestedPlate));
  const avgConfidence = ocrIncidents.length > 0
    ? Math.round(ocrIncidents.reduce((sum, i) => sum + (i.ocrConfidence || 0), 0) / ocrIncidents.length)
    : 0;
  // Acierto implícito: lecturas OCR que el operador no corrigió a mano.
  const ocrAccuracy = ocrIncidents.length > 0
    ? Math.max(0, Math.round((1 - ocrCorrections.length / ocrIncidents.length) * 100))
    : 0;

  const tsToDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const fmtDate = (value: any): string => {
    const date = tsToDate(value);
    if (!date) return '—';
    return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // ── Dimensiones temporales (los incidentes y usuarios llevan createdAt) ──
  const hoyFin = new Date(); hoyFin.setHours(23, 59, 59, 999);
  const hace30 = new Date(hoyFin); hace30.setDate(hace30.getDate() - 29); hace30.setHours(0, 0, 0, 0);
  const hace7 = new Date(hoyFin); hace7.setDate(hace7.getDate() - 6); hace7.setHours(0, 0, 0, 0);
  const hace14 = new Date(hoyFin); hace14.setDate(hace14.getDate() - 13); hace14.setHours(0, 0, 0, 0);

  const incidentesConFecha = incidents
    .map(i => ({ ...i, fecha: tsToDate(i.createdAt) }))
    .filter(i => i.fecha !== null);

  // Serie de 30 días para el AreaChart
  const serieIncidentes = Array.from({ length: 30 }, (_, idx) => {
    const dia = new Date(hace30); dia.setDate(hace30.getDate() + idx);
    const siguiente = new Date(dia); siguiente.setDate(dia.getDate() + 1);
    return {
      label: `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}`,
      incidentes: incidentesConFecha.filter(i => i.fecha! >= dia && i.fecha! < siguiente).length,
    };
  });

  const delta = (actual: number, previa: number): number =>
    previa === 0 ? (actual > 0 ? 100 : 0) : Math.round(((actual - previa) / previa) * 100);

  const enSemanaIncidentes = incidentesConFecha.filter(i => i.fecha! >= hace7).length;
  const prevSemanaIncidentes = incidentesConFecha.filter(i => i.fecha! >= hace14 && i.fecha! < hace7).length;
  const deltaIncidentes = delta(enSemanaIncidentes, prevSemanaIncidentes);

  const usuariosConFecha = users
    .map(u => ({ fecha: tsToDate(u.createdAt) }))
    .filter(u => u.fecha !== null);
  const enSemanaUsuarios = usuariosConFecha.filter(u => u.fecha! >= hace7).length;
  const prevSemanaUsuarios = usuariosConFecha.filter(u => u.fecha! >= hace14 && u.fecha! < hace7).length;
  const deltaUsuarios = delta(enSemanaUsuarios, prevSemanaUsuarios);

  const sparkIncidentes = serieIncidentes.slice(-7).map(d => ({ v: d.incidentes }));
  const sparkUsuarios = Array.from({ length: 7 }, (_, idx) => {
    const dia = new Date(hace7); dia.setDate(hace7.getDate() + idx);
    const siguiente = new Date(dia); siguiente.setDate(dia.getDate() + 1);
    return { v: usuariosConFecha.filter(u => u.fecha! >= dia && u.fecha! < siguiente).length };
  });

  const cerrados = incidents.filter(i => i.status !== 'OPEN').length;
  const tasaCierre = Math.round((incidents.filter(i => i.status === 'RESOLVED').length / (incidents.length || 1)) * 100);

  // ── Paleta de marca para los charts (mismos tokens del landing) ──
  const TIP_COLORS: Record<string, string> = {
    ROBO: '#FF4D00',
    SOSPECHOSO: '#00E676',
    MARCAJE: '#38bdf8',
    OTRO: '#94a3b8',
  };
  const pieData = Object.entries(statsByType).map(([name, value]) => ({ name, value, color: TIP_COLORS[name] || '#94a3b8' }));

  const statusData = [
    { name: 'Abiertos', value: incidents.filter(i => i.status === 'OPEN').length, color: '#E20B17' },
    { name: 'Resueltos', value: incidents.filter(i => i.status === 'RESOLVED').length, color: '#00E676' },
    { name: 'Falsa Alarma', value: incidents.filter(i => i.status === 'FALSE_ALARM').length, color: '#94a3b8' },
  ];

  const tooltipTactico = {
    backgroundColor: '#0b1220',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 11,
  };

  // Filtering Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (user.status || 'ACTIVE') === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['Nombre', 'Email', 'Rol', 'Estado'];
    const csvRows = [
      headers.join(','),
      ...users.map(user => [
        `"${user.displayName || 'Sin nombre'}"`,
        `"${user.email}"`,
        `"${user.role}"`,
        `"${user.status || 'ACTIVE'}"`
      ].join(','))
    ];
    
    const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_alertadealers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto">
      {/* N-S9: el fallo de conexión y el estado de carga son visibles — antes
          un error de Firestore se leía como bandeja vacía. */}
      <ConnectionBanner show={dbOffline} />
      {loading && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold uppercase tracking-wider"
          role="status"
        >
          <Spinner className="w-4 h-4 shrink-0 animate-spin" />
          Cargando datos de la red…
        </div>
      )}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-700 p-2 rounded-xl shadow-lg shadow-black/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {/* El shell de la app es claro: título oscuro como en el Panel (A-22) */}
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Panel de Administración</h1>
          </div>
          <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">Control Centralizado y Auditoría de Seguridad</p>
        </div>

        {/* N-D3: a 375px las 4 pestañas desbordaban sin affordance — fila
            scrollable con snap y botones sin salto de línea.
            La píldora activa ya no es bg del botón: es el ::before del
            contenedor anclado a data-active (CSS Anchor Positioning, ver
            .sliding-tabs en index.css) — se desliza entre pestañas. */}
        <nav className="sliding-tabs flex w-full md:w-auto bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto [--sliding-pill-bg:#334155] [--sliding-pill-radius:0.75rem] [--sliding-pill-shadow:0_10px_15px_-3px_rgb(0_0_0/0.2)]">
          <button
            onClick={() => setActiveTab('STATS')}
            data-active={activeTab === 'STATS' ? 'true' : undefined}
            className={`shrink-0 whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'STATS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            data-active={activeTab === 'USERS' ? 'true' : undefined}
            className={`shrink-0 whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'USERS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('OPS')}
            data-active={activeTab === 'OPS' ? 'true' : undefined}
            className={`shrink-0 whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'OPS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Registros
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            data-active={activeTab === 'REQUESTS' ? 'true' : undefined}
            className={`relative shrink-0 whitespace-nowrap px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'REQUESTS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Tray className="w-3.5 h-3.5" />
            Solicitudes
            {pendingCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center ${activeTab === 'REQUESTS' ? 'bg-white text-slate-900' : 'bg-slate-700 text-white'}`}>
                {pendingCount}
              </span>
            )}
          </button>
        </nav>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'STATS' ? (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Usuarios', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', delta: deltaUsuarios, invertDelta: false, spark: sparkUsuarios, sparkColor: '#38bdf8', sub: 'operadores verificados' },
                { label: 'Total Incidentes', value: incidents.length, icon: Warning, color: 'text-red-500', bg: 'bg-red-500/10', delta: deltaIncidentes, invertDelta: true, spark: sparkIncidentes, sparkColor: '#E20B17', sub: `${enSemanaIncidentes} en los últimos 7 días` },
                { label: 'Tasa de Cierre', value: `${tasaCierre}%`, icon: SealCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: `${cerrados} de ${incidents.length} casos` },
                { label: 'Sedes Activas', value: dealerships.length, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10', sub: 'nodos verificados con RUT' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl relative overflow-hidden group">
                  <div className="flex items-center justify-between relative z-10 mb-3">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} weight="duotone" />
                    {typeof stat.delta === 'number' && (
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                          stat.delta > 0
                            ? (stat.invertDelta ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400')
                            : stat.delta < 0
                              ? (stat.invertDelta ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-300')
                              : 'bg-slate-700 text-slate-300'
                        }`}
                        title="Variación vs los 7 días anteriores"
                      >
                        {stat.delta > 0 ? '↑' : stat.delta < 0 ? '↓' : '='} {Math.abs(stat.delta)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5 relative z-10">{stat.label}</p>
                  <p className="text-3xl font-black text-white relative z-10">{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 relative z-10">{stat.sub}</p>
                  {stat.spark && (
                    <div className="mt-2 -mx-1 relative z-10">
                      <MiniSpark data={stat.spark} color={stat.sparkColor} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Pulse className="w-4 h-4 text-[#E20B17]" weight="duotone" />
                  Incidentes — últimos 30 días
                </h2>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                    deltaIncidentes > 0 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                  title="Últimos 7 días vs los 7 anteriores"
                >
                  {deltaIncidentes > 0 ? '↑' : deltaIncidentes < 0 ? '↓' : '='} {Math.abs(deltaIncidentes)}% semana
                </span>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={serieIncidentes} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIncidentes30" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E20B17" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#E20B17" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                    interval={4}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                    width={30}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                    contentStyle={tooltipTactico}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                    itemStyle={{ color: '#FF4D00' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incidentes"
                    name="Incidentes"
                    stroke="#E20B17"
                    strokeWidth={2}
                    fill="url(#gradIncidentes30)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Calidad del OCR de patentes: decide si conviene migrar de
                Tesseract a un motor externo. accuracy = lecturas OCR que el
                operador no tuvo que corregir a mano. Ubicada en el bloque
                principal: con el OCR operando al 100% es una métrica de
                producto diferenciadora, no un dato de segunda línea. */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Scan className="w-4 h-4 text-slate-300" />
                  Calidad del Reconocimiento de Patentes (OCR)
                </h2>
                {platedIncidents.length > 0 && (
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                      ocrAccuracy >= 90 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    Acierto implícito: {ocrAccuracy}%
                  </span>
                )}
              </div>
              {platedIncidents.length === 0 ? (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Sin incidentes con patente todavía — las métricas aparecen al usar el escáner.
                </p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Con Patente', value: platedIncidents.length, hint: 'incidentes totales', color: 'text-white' },
                    { label: 'Leídas por OCR', value: ocrIncidents.length, hint: `${manualIncidents.length} escritas a mano`, color: 'text-sky-400' },
                    { label: 'Confianza Promedio', value: ocrIncidents.length > 0 ? `${avgConfidence}%` : '—', hint: 'del motor Tesseract', color: avgConfidence >= 75 ? 'text-emerald-400' : 'text-amber-400' },
                    { label: 'Corregidas a Mano', value: ocrCorrections.length, hint: 'OCR equivocado', color: ocrCorrections.length === 0 ? 'text-emerald-400' : 'text-red-400' },
                    { label: 'Acierto Implícito', value: ocrIncidents.length > 0 ? `${ocrAccuracy}%` : '—', hint: 'sin corrección del operador', color: ocrAccuracy >= 90 ? 'text-emerald-400' : 'text-amber-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.hint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center">
                <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 self-start flex items-center gap-2">
                  <ChartBar className="w-4 h-4 text-slate-300" />
                  Distribución por Tipo
                </h2>
                <div className="relative w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={84}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipTactico}
                        labelStyle={{ color: '#e2e8f0' }}
                        itemStyle={{ color: '#FF4D00', textTransform: 'uppercase' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-black text-white">{incidents.length}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">casos</p>
                  </div>
                </div>
                {/* Leyenda con valores — la del recharts no mostraba números */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
                  {pieData.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                      {d.name} <strong className="text-white">{d.value}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col">
                <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 self-start flex items-center gap-2">
                  <Pulse className="w-4 h-4 text-slate-300" />
                  Estado de Resolución
                </h2>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ bottom: 4 }}>
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={tooltipTactico}
                        labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                        itemStyle={{ color: '#FF4D00' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {statusData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </motion.div>
        ) : activeTab === 'USERS' ? (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Funnel Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-900 border border-slate-800 p-4 rounded-3xl">
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition-all"
                  />
                </div>
                <div className="relative">
                  <Funnel className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-base font-black text-white appearance-none uppercase tracking-widest focus:outline-none focus:border-slate-600 transition-all cursor-pointer"
                  >
                    <option value="ALL">TODOS LOS ROLES</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">PROPIETARIO</option>
                    <option value="SECURITY">SEGURIDAD</option>
                  </select>
                </div>
                <div className="relative">
                  <Pulse className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-base font-black text-white appearance-none uppercase tracking-widest focus:outline-none focus:border-slate-600 transition-all cursor-pointer"
                  >
                    <option value="ALL">TODOS LOS ESTADOS</option>
                    <option value="ACTIVE">ACTIVOS</option>
                    <option value="SUSPENDED">SUSPENDIDOS</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleExportCSV}
                className="w-full lg:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-slate-700 shadow-lg shadow-black/20"
              >
                <DownloadSimple className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>

            {/* Feedback visible de acciones sobre usuarios (A-21: nada de catch mudo) */}
            {actionOk && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider" role="status">
                {actionOk}
              </div>
            )}
            {actionError && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold" role="alert">
                {actionError}
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                      <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Rol</th>
                      <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Sede</th>
                      <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                                {user.displayName?.charAt(0) || user.email?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white leading-none mb-1">{user.displayName || 'Sin nombre'}</p>
                                <p className="text-xs text-slate-400 font-mono tracking-tighter">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                              className="bg-slate-800 text-sm font-black text-white px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-slate-600 uppercase tracking-widest transition-all cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="OWNER">PROPIETARIO</option>
                              <option value="SECURITY">SEGURIDAD</option>
                            </select>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-bold text-slate-400 truncate">{user.dealershipId || '—'}</span>
                          </td>
                          <td className="p-6">
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {user.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => handleToggleStatus(user.uid, user.status || 'ACTIVE')}
                              className={`p-2 rounded-xl transition-all ${user.status === 'SUSPENDED' ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-red-500 bg-red-500/10 hover:bg-red-500/20'}`}
                              title={user.status === 'SUSPENDED' ? 'Activar Usuario' : 'Suspender Usuario'}
                            >
                              {user.status === 'SUSPENDED' ? <SealCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <Users className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-50" />
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No se encontraron usuarios</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Mostrando <span className="text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> de <span className="text-white">{filteredUsers.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <CaretLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-slate-700 text-white shadow-lg shadow-black/20' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <CaretRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'OPS' ? (
          <motion.div
            key="ops"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-8"
          >
            {/* Test Drives: antes colección huérfana (se escribía, nadie leía) */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Path className="w-4 h-4 text-slate-300" />
                Pruebas en Ruta (últimas 30)
              </h2>
              {roadTests.length === 0 ? (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest py-8 text-center">
                  Sin pruebas de manejo registradas aún.
                </p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {roadTests.map((test) => (
                    <div key={test.id} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-black font-mono text-white tracking-wider uppercase">
                          {test.vehiclePlate || 'S/PATENTE'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 font-mono uppercase">
                          {fmtDate(test.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {test.notes || 'Sin observaciones.'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {test.dealershipId || '—'}
                        </span>
                        {test.status && (
                          <span className="text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                            {test.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fiscalizaciones: ídem, ahora visible para admin */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-300" />
                Alertas de Fiscalización (últimas 30)
              </h2>
              {inspectionAlerts.length === 0 ? (
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest py-8 text-center">
                  Sin avisos de fiscalización registrados aún.
                </p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {inspectionAlerts.map((alert) => (
                    <div key={alert.id} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(alert.agencies || []).map((agency) => (
                            <span key={agency} className="text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                              {agency}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 font-mono uppercase">
                          {fmtDate(alert.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{alert.message || 'Sin detalle.'}</p>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-2">
                        {alert.dealershipId || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <AdminAccessRequests />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

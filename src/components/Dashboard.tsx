import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { safeUUID } from '../lib/uuid';
import { ShieldAlert, Users, TrendingUp, AlertCircle, Clock, Info, Sparkles, Filter, Calendar, ChevronDown, Search, X, Activity, ListFilter, History, Bell, BellOff, CheckCircle, Ban, AlertTriangle, MapPin, Plus, Camera, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateSecurityTip } from '../services/geminiService';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../hooks/useAuth';
import IncidentReportForm from './IncidentReportForm';
import RoadTestForm from './RoadTestForm';
import InspectionForm from './InspectionForm';
import StockAutomotoras from './StockAutomotoras';
import BottomNavbar, { TabType } from './BottomNavbar';
import { Route, Car, ShieldCheck } from 'lucide-react';

interface Incident {
  id: string;
  type: string;
  description: string;
  createdAt: any;
  status: string;
  reporterId?: string;
  dealershipId?: string;
  imageUrl?: string;
  isEdited?: boolean;
  editedAt?: any;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
}

interface Dealership {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  status?: 'online' | 'offline';
  lastSeen?: string;
}

const HEARTBEAT_THRESHOLD_MS = 10 * 60 * 1000;

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newIncidentNotify, setNewIncidentNotify] = useState<Incident | null>(null);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState<string>("Analizando patrones de seguridad...");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [reporterInfo, setReporterInfo] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [isRoadTestOpen, setIsRoadTestOpen] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('PANEL');
  const { permission } = usePushNotifications();
  const { profile } = useAuth();

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Timeline specific filters
  const [timelineType, setTimelineType] = useState<string>('ALL');
  const [timelineDate, setTimelineDate] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Real-time count of ALL open incidents across the network
    const qOpen = query(collection(db, 'incidents'), where('status', '==', 'OPEN'));
    const unsubOpen = onSnapshot(qOpen, (snapshot) => {
      setOpenIncidentsCount(snapshot.size);
    });
    return () => unsubOpen();
  }, []);
  
  useEffect(() => {
    const fetchReporter = async () => {
      if (selectedIncident?.reporterId) {
        setReporterInfo(null);
        try {
          const userDoc = await getDoc(doc(db, 'users', selectedIncident.reporterId));
          if (userDoc.exists()) {
            setReporterInfo({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching reporter:", error);
        }
      } else {
        setReporterInfo(null);
      }
    };
    fetchReporter();
  }, [selectedIncident]);
  
  // Active Filter States (applied)
  const [typeFilter, setTypeFilter] = useState<string[]>(['ROBO', 'SOSPECHOSO', 'MARCAJE', 'OTRO']);
  const [statusFilter, setStatusFilter] = useState<string[]>(['OPEN', 'RESOLVED', 'FALSE_ALARM']);
  const [dealershipFilter, setDealershipFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Temporary Filter States (pending apply)
  const [tempTypeFilter, setTempTypeFilter] = useState<string[]>(['ROBO', 'SOSPECHOSO', 'MARCAJE', 'OTRO']);
  const [tempStatusFilter, setTempStatusFilter] = useState<string[]>(['OPEN', 'RESOLVED', 'FALSE_ALARM']);
  const [tempDealershipFilter, setTempDealershipFilter] = useState<string[]>([]);
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  const hasPendingChanges = 
    JSON.stringify(typeFilter) !== JSON.stringify(tempTypeFilter) ||
    JSON.stringify(statusFilter) !== JSON.stringify(tempStatusFilter) ||
    JSON.stringify(dealershipFilter) !== JSON.stringify(tempDealershipFilter) ||
    JSON.stringify(dateRange) !== JSON.stringify(tempDateRange);

  const incidentTypes = ['ROBO', 'SOSPECHOSO', 'MARCAJE', 'OTRO'];
  const statusTypes = [
    { id: 'OPEN', label: 'Abierto', color: 'bg-red-500' },
    { id: 'RESOLVED', label: 'Resuelto', color: 'bg-emerald-500' },
    { id: 'FALSE_ALARM', label: 'Falsa Alarma', color: 'bg-slate-500' }
  ];

  useEffect(() => {
    const qIncidents = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(50));
    const unsubIncidents = onSnapshot(qIncidents, async (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data();
        // Convert Firestore Timestamp to Date if it exists
        const createdAt = item.createdAt?.toDate?.() || item.createdAt;
        return { id: doc.id, ...item, createdAt };
      }) as Incident[];

      // Detect new arrivals for notification (excluding first load)
      if (!loading && data.length > incidents.length) {
        const newest = data[0];
        // Only notify if it's actually new (within last minute)
        const isVeryRecent = newest.createdAt && (Date.now() - new Date(newest.createdAt).getTime() < 30000);
        if (isVeryRecent && newest.id !== incidents[0]?.id) {
          setNewIncidentNotify(newest);
          setTimeout(() => setNewIncidentNotify(null), 8000);
        }
      }

      setIncidents(data);
      setLoading(false);
      
      // Auto-select incident from deep link
      const params = new URLSearchParams(window.location.search);
      const sharedId = params.get('incident');
      if (sharedId) {
        const sharedDoc = data.find(i => i.id === sharedId);
        if (sharedDoc) setSelectedIncident(sharedDoc);
      }
      
      if (data.length > 0) {
        setIsAiLoading(true);
        const tip = await generateSecurityTip(data);
        setAiTip(tip);
        setIsAiLoading(false);
      }
    });

    const unsubDealers = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Dealership[];
      setDealerships(data);
    });

    return () => {
      unsubIncidents();
      unsubDealers();
    };
  }, [loading, incidents]);

  const filteredIncidents = incidents.filter(incident => {
    const matchesType = typeFilter.includes(incident.type);
    const matchesStatus = statusFilter.includes(incident.status || 'OPEN');
    const matchesDealership = dealershipFilter.length === 0 || (incident.dealershipId && dealershipFilter.includes(incident.dealershipId));
    
    let matchesDate = true;
    if (dateRange.start || dateRange.end) {
      const incidentDate = new Date(incident.createdAt);
      if (dateRange.start) {
        const start = new Date(dateRange.start);
        matchesDate = matchesDate && incidentDate >= start;
      }
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && incidentDate <= end;
      }
    }
    
    return matchesType && matchesStatus && matchesDealership && matchesDate;
  });

  const filteredTimelineIncidents = incidents.filter(incident => {
    const matchesType = timelineType === 'ALL' || incident.type === timelineType;
    const matchesDealership = dealershipFilter.length === 0 || (incident.dealershipId && dealershipFilter.includes(incident.dealershipId));
    
    let matchesDate = true;
    if (timelineDate.start || timelineDate.end) {
      const incidentDate = new Date(incident.createdAt);
      if (timelineDate.start) {
        matchesDate = matchesDate && incidentDate >= new Date(timelineDate.start);
      }
      if (timelineDate.end) {
        const end = new Date(timelineDate.end);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && incidentDate <= end;
      }
    }
    
    return matchesType && matchesDealership && matchesDate;
  });

  const toggleTempType = (type: string) => {
    setTempTypeFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleTempStatus = (status: string) => {
    setTempStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const toggleTempDealership = (id: string) => {
    setTempDealershipFilter(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedIncident) return;
    try {
      const incidentRef = doc(db, 'incidents', selectedIncident.id);
      await updateDoc(incidentRef, {
        status,
        updatedAt: serverTimestamp()
      });
      // Locally update to show immediate feedback if needed, 
      // but onSnapshot should also handle it.
      setSelectedIncident(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  const applyFilters = () => {
    setTypeFilter(tempTypeFilter);
    setStatusFilter(tempStatusFilter);
    setDealershipFilter(tempDealershipFilter);
    setDateRange(tempDateRange);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const allTypes = ['ROBO', 'SOSPECHOSO', 'MARCAJE', 'OTRO'];
    const allStatuses = ['OPEN', 'RESOLVED', 'FALSE_ALARM'];
    const emptyDocs: string[] = [];
    const emptyDates = { start: '', end: '' };

    setTempTypeFilter(allTypes);
    setTempStatusFilter(allStatuses);
    setTempDealershipFilter(emptyDocs);
    setTempDateRange(emptyDates);
    
    setTypeFilter(allTypes);
    setStatusFilter(allStatuses);
    setDealershipFilter(emptyDocs);
    setDateRange(emptyDates);
  };

  const startEditing = () => {
    if (!selectedIncident) return;
    setEditDescription(selectedIncident.description);
    setEditImage(null);
    setEditImagePreview(selectedIncident.imageUrl || null);
    setEditError(null);
    setIsEditing(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedIncident) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      let imageUrl = selectedIncident.imageUrl || '';
      if (editImage) {
        const storageRef = ref(storage, `incidents/${safeUUID()}-${editImage.name}`);
        const uploadResult = await uploadBytes(storageRef, editImage);
        imageUrl = await getDownloadURL(uploadResult.ref);
      } else if (editImagePreview === null) {
        imageUrl = '';
      }

      const incidentRef = doc(db, 'incidents', selectedIncident.id);
      await updateDoc(incidentRef, {
        description: editDescription,
        imageUrl,
        isEdited: true,
        editedAt: serverTimestamp()
      });

      const updatedIncident = {
        ...selectedIncident,
        description: editDescription,
        imageUrl,
        isEdited: true,
        editedAt: new Date().toISOString()
      };
      setSelectedIncident(updatedIncident);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating incident:", err);
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-7xl mx-auto">
      {/* New Incident Toast Notification */}
      <AnimatePresence>
        {newIncidentNotify && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 24, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[3000] w-full max-w-md px-4"
          >
            <div 
              onClick={() => {
                setSelectedIncident(newIncidentNotify);
                setNewIncidentNotify(null);
              }}
              className="bg-red-600 border border-red-500 p-4 rounded-2xl shadow-2xl shadow-red-900/40 cursor-pointer flex items-center gap-4 group"
            >
              <div className="bg-white/20 p-2 rounded-xl">
                <Bell className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Nueva Alerta Crítica</p>
                <h4 className="text-white font-bold leading-tight">{newIncidentNotify.type}: {newIncidentNotify.description.slice(0, 40)}...</h4>
              </div>
              <ChevronDown className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Banner System */}
      <div className="space-y-4">
        {permission !== 'granted' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between text-orange-400"
          >
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 animate-pulse" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Alertas no Permitidas</p>
                <p className="text-[10px] opacity-70">Para recibir notificaciones críticas, por favor habilita los permisos en tu navegador.</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${openIncidentsCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${openIncidentsCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`font-bold text-sm uppercase tracking-widest ${openIncidentsCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                Estado de Operación en Tiempo Real
              </h2>
              <p className="text-xs text-slate-400"> Monitoreo continuo de seguridad en toda la red </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Incidentes Activos</p>
              <p className={`text-2xl font-black ${openIncidentsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {openIncidentsCount}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* PARTE CENTRAL (BOCETO 5): Máximo 4 opciones simples */}
      {activeTab === 'PANEL' && (
        <>
          <section className="space-y-6">
            <div className="text-center md:text-left">
              <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                Acciones Principales
              </h2>
              <p className="text-xs text-slate-400 font-medium">Selecciona una opción o realiza scroll suave para explorar la red</p>
            </div>

            {/* 4 Opciones Simples en disposición vertical/grid móvil táctil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1era Opcion: REPORTE Robo / Sospechoso */}
              <button
                type="button"
                onClick={() => setIsReporting(true)}
                className="glass-button-action p-5 rounded-[1.8rem] flex items-center justify-between group border border-red-500/30 bg-gradient-to-r from-red-950/40 to-slate-900/60 hover:from-red-900/50 hover:to-slate-900 transition-all shadow-lg active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight">REPORTE</p>
                    <p className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Robo / Sospechoso</p>
                  </div>
                </div>
                <span className="text-xs font-black text-red-400 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* 2da Opcion: PRUEBA EN RUTA */}
              <button
                type="button"
                onClick={() => setIsRoadTestOpen(true)}
                className="glass-button-action p-5 rounded-[1.8rem] flex items-center justify-between group border border-orange-500/30 bg-gradient-to-r from-orange-950/40 to-slate-900/60 hover:from-orange-900/50 hover:to-slate-900 transition-all shadow-lg active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                    <Route className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight">PRUEBA EN RUTA</p>
                    <p className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">Respaldo Previo</p>
                  </div>
                </div>
                <span className="text-xs font-black text-orange-400 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* 3era Opcion: Fiscalización */}
              <button
                type="button"
                onClick={() => setIsInspectionOpen(true)}
                className="glass-button-action p-5 rounded-[1.8rem] flex items-center justify-between group border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-slate-900/60 hover:from-blue-900/50 hover:to-slate-900 transition-all shadow-lg active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight">Fiscalización</p>
                    <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Registro de Control</p>
                  </div>
                </div>
                <span className="text-xs font-black text-blue-400 group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              {/* 4ta Opcion: STOCK AUTOMOTORAS */}
              <button
                type="button"
                onClick={() => setIsStockOpen(true)}
                className="glass-button-action p-5 rounded-[1.8rem] flex items-center justify-between group border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-slate-900/60 hover:from-emerald-900/50 hover:to-slate-900 transition-all shadow-lg active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Car className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-white uppercase tracking-tight">STOCK AUTOMOTORAS</p>
                    <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Inventario Red</p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 group-hover:translate-x-1 transition-transform">➔</span>
              </button>
            </div>
          </section>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Alertas Activas', value: openIncidentsCount, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
              { label: 'Incidentes Hoy', value: incidents.length, icon: ShieldAlert, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { label: 'Red Colaborativa', value: '48 Locales', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Eficacia Red', value: '94%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
            ].map((stat, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={stat.label}
                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 group hover:border-slate-700 transition-all cursor-default"
              >
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">{stat.label}</p>
                  <h3 className="text-xl font-bold text-white">{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Intelligence Feed */}
      {activeTab === 'FEED' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Intelligence Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-primary" />
              Feed de Inteligencia Local
            </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsReporting(true)}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg border border-red-500 transition-all uppercase font-black tracking-widest flex items-center gap-2 shadow-lg shadow-red-900/20"
              >
                <Plus className="w-4 h-4" />
                Reportar
              </button>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all uppercase font-bold tracking-widest ${showFilters ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(typeFilter.length < 3 || statusFilter.length < 3 || dealershipFilter.length > 0 || dateRange.start || dateRange.end) && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )}
              </button>
              <button 
                onClick={() => {
                  const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reporte-seguridad-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                }}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-all uppercase font-bold tracking-widest"
              >
                Exportar JSON
              </button>
              <button 
                onClick={() => {
                  const element = document.getElementById('timeline');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs text-slate-500 hover:text-white transition-all uppercase font-bold tracking-widest"
              >
                Ver Historial
              </button>

            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Type Filter */}
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> Tipo de Incidente
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {incidentTypes.map(type => (
                          <button
                            key={type}
                            onClick={() => toggleTempType(type)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${tempTypeFilter.includes(type) ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" /> Estado
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {statusTypes.map(status => (
                          <button
                            key={status.id}
                            onClick={() => toggleTempStatus(status.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 ${tempStatusFilter.includes(status.id) ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-800/30 border-slate-800 text-slate-600'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${tempStatusFilter.includes(status.id) ? status.color : 'bg-slate-700'}`} />
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dealership Filter */}
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users className="w-3 h-3" /> Dealership / Sede
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        {dealerships.map(dealer => (
                          <button
                            key={dealer.id}
                            onClick={() => toggleTempDealership(dealer.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${tempDealershipFilter.includes(dealer.id) ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                          >
                            {dealer.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Rango de Fechas
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="date"
                          value={tempDateRange.start}
                          onChange={(e) => setTempDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="bg-slate-800 border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:ring-1 focus:ring-brand-primary outline-none flex-1"
                        />
                        <span className="text-slate-600">-</span>
                        <input 
                          type="date"
                          value={tempDateRange.end}
                          onChange={(e) => setTempDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="bg-slate-800 border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:ring-1 focus:ring-brand-primary outline-none flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                    <button 
                      onClick={clearFilters}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" /> Limpiar Filtros
                    </button>
                    
                    <button 
                      onClick={applyFilters}
                      disabled={!hasPendingChanges}
                      className={`text-[10px] font-black py-2.5 px-6 rounded-xl transition-all uppercase tracking-[0.15em] shadow-lg flex items-center gap-2 ${hasPendingChanges ? 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/20 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {hasPendingChanges ? 'Aplicar Cambios' : 'Filtros Aplicados'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="p-8 text-center text-slate-500 italic">Analizando reportes...</div>
              ) : filteredIncidents.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl text-slate-500">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p>Sin incidentes que coincidan con los filtros</p>
                </div>
              ) : filteredIncidents.map((incident, idx) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedIncident(incident)}
                  className={`p-5 rounded-2xl flex gap-4 transition-all cursor-pointer group relative overflow-hidden ${
                    incident.type === 'ROBO' 
                      ? 'bg-red-500/5 border-2 border-red-500/50 shadow-lg shadow-red-500/5' 
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`w-1 absolute left-0 top-0 bottom-0 ${incident.type === 'ROBO' ? 'bg-red-500' : incident.type === 'SOSPECHOSO' ? 'bg-orange-500' : incident.type === 'MARCAJE' ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
                  <div className={`p-3 h-fit rounded-xl ${incident.type === 'ROBO' ? 'bg-red-500/10 text-red-500' : incident.type === 'SOSPECHOSO' ? 'bg-orange-500/10 text-orange-500' : incident.type === 'MARCAJE' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>
                    {incident.type === 'ROBO' && <ShieldAlert className="w-5 h-5" />}
                    {incident.type === 'SOSPECHOSO' && <AlertTriangle className="w-5 h-5" />}
                    {incident.type === 'MARCAJE' && <MapPin className="w-5 h-5" />}
                    {incident.type === 'OTRO' && <Info className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">#{incident.id.slice(0, 8)}</span>
                        {incident.isEdited && (
                          <span className="text-[8px] font-bold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                            ✏️ Editado
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-2 leading-none flex items-center gap-2">
                        {incident.type === 'ROBO' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                        {incident.type === 'SOSPECHOSO' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {incident.type === 'MARCAJE' && <MapPin className="w-4 h-4 text-blue-500" />}
                        {incident.type === 'OTRO' && <Info className="w-4 h-4 text-slate-500" />}
                        ALERTA: {incident.type}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">
                      {incident.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar: Nearby Dealerships / News */}
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Locales Conectados
                </h3>
                <div className="space-y-4">
                    {dealerships.length === 0 ? (
                        <div className="text-xs text-slate-500 italic">No hay locales registrados...</div>
                    ) : dealerships.slice(0, 5).map((dealer) => {
                        let isOnline = dealer.status === 'online';
                        if (dealer.lastSeen) {
                            const lastSeenTime = new Date(dealer.lastSeen).getTime();
                            isOnline = (now - lastSeenTime) < HEARTBEAT_THRESHOLD_MS;
                        }
                        
                        return (
                            <div key={dealer.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{dealer.name}</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${isOnline ? 'text-emerald-500/50' : 'text-slate-600'}`}>
                                    {isOnline ? 'LIVE' : 'OFF'}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <button className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 rounded-xl transition-all uppercase tracking-widest">
                    Ver Red Completa
                </button>
            </div>

            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles className="w-12 h-12 text-brand-primary" />
                </div>
                <h3 className="font-bold text-brand-primary mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" />
                    Tip de Seguridad IA
                </h3>
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={aiTip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`text-slate-300 text-xs leading-relaxed italic ${isAiLoading ? 'animate-pulse' : ''}`}
                  >
                    "{aiTip}"
                  </motion.p>
                </AnimatePresence>
            </div>
        </div>
      </div>
      )}

      {/* Chronological Timeline Section */}
      {activeTab === 'HISTORIAL' && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 scroll-mt-24" id="timeline">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-800">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
              <History className="w-6 h-6 text-brand-primary" />
              Cronología de Eventos
            </h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em]">Historial completo de la red de seguridad</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
              {['ALL', ...incidentTypes].map((type) => (
                <button
                  key={type}
                  onClick={() => setTimelineType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                    timelineType === type 
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {type === 'ALL' ? 'Todos' : type}
                </button>
              ))}
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
                <input 
                  type="date" 
                  value={timelineDate.start}
                  onChange={(e) => setTimelineDate(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent border-none text-[10px] text-white focus:ring-0 w-24 p-0 outline-none"
                />
                <span className="text-slate-600 text-xs">→</span>
                <input 
                  type="date" 
                  value={timelineDate.end}
                  onChange={(e) => setTimelineDate(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent border-none text-[10px] text-white focus:ring-0 w-24 p-0 outline-none"
                />
                {(timelineDate.start || timelineDate.end) && (
                  <button 
                    onClick={() => setTimelineDate({ start: '', end: '' })}
                    className="p-1 hover:bg-slate-700 rounded-full text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative pl-8 border-l border-slate-800 space-y-12 ml-4 pt-4">
          {filteredTimelineIncidents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 italic flex flex-col items-center gap-4">
              <Search className="w-10 h-10 opacity-20" />
              <p>No se encontraron eventos en este periodo o categoría.</p>
            </div>
          ) : (
            filteredTimelineIncidents.map((incident, idx) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative group"
              >
                {/* Timeline Dot */}
                <div className={`absolute -left-[41px] top-1.5 w-5 h-5 rounded-full border-4 border-slate-900 z-10 transition-transform group-hover:scale-125 ${
                  incident.type === 'ROBO' ? 'bg-red-500 shadow-lg shadow-red-500/20' : 
                  incident.type === 'SOSPECHOSO' ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 
                  incident.type === 'MARCAJE' ? 'bg-blue-500 shadow-lg shadow-blue-500/20' :
                  'bg-slate-500 shadow-lg shadow-slate-500/20'
                }`} />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-brand-primary font-mono bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">
                      {new Date(incident.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {new Date(incident.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                      incident.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {incident.status || 'OPEN'}
                    </div>
                    {incident.isEdited && (
                      <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        ✏️ Editado
                      </div>
                    )}
                  </div>

                  <div className={`p-6 rounded-2xl transition-all group-hover:shadow-xl group-hover:shadow-black/20 ${
                    incident.type === 'ROBO' 
                      ? 'bg-red-500/5 border-2 border-red-500/50 shadow-lg shadow-red-500/5' 
                      : 'bg-slate-900 border border-slate-800 group-hover:border-slate-700'
                  }`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-lg font-black text-white tracking-tighter leading-none mb-1 group-hover:text-brand-primary transition-colors flex items-center gap-2">
                          {incident.type === 'ROBO' ? (
                            <><ShieldAlert className="w-5 h-5 text-red-500" /> 🛑 ROBO DETECTADO</>
                          ) : incident.type === 'SOSPECHOSO' ? (
                            <><AlertTriangle className="w-5 h-5 text-orange-500" /> ⚠️ ACTIVIDAD SOSPECHOSA</>
                          ) : incident.type === 'MARCAJE' ? (
                            <><MapPin className="w-5 h-5 text-blue-500" /> 📍 MARCAJE DETECTADO</>
                          ) : (
                            <><Info className="w-5 h-5 text-slate-500" /> ℹ️ REPORTE DE SEGURIDAD</>
                          )}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">#{incident.id.slice(0, 12)}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedIncident(incident)}
                        className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
                      >
                        Ver Detalles
                      </button>
                    </div>
                    
                    <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                      {incident.description}
                    </p>

                    <div className="mt-4 flex items-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        <span>Sede: {incident.dealershipId || 'Central Coquimbo'}</span>
                      </div>
                      {incident.imageUrl && (
                        <div className="flex items-center gap-2 text-brand-primary">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Evidencia Adjunta</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    )}

      {/* Incident Detail Modal */}

      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            onClick={() => { setSelectedIncident(null); setIsEditing(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {isEditing ? (
                <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-4">
                    <div className="bg-brand-primary p-2.5 rounded-2xl shadow-lg shadow-brand-primary/40 rotate-3 animate-pulse">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">Editar Evento</h3>
                      <p className="text-brand-primary/60 text-[9px] font-bold uppercase tracking-[0.2em]">Actualizar detalles e imágenes del evento</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block pl-1">Descripción del Suceso</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 text-white text-sm focus:outline-none focus:border-brand-primary focus:bg-white/[0.07] transition-all min-h-[120px]"
                        placeholder="Describe lo ocurrido..."
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block pl-1">Evidencia Fotográfica</label>
                      <div className="flex gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          ref={editFileInputRef}
                          className="hidden"
                          onChange={handleEditFileChange}
                          id="edit-photo-upload-input"
                        />
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className={`flex-1 h-12 flex items-center justify-center gap-3 rounded-2xl border transition-all text-xs font-black uppercase tracking-widest ${editImagePreview ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-400 select-none'}`}
                        >
                          <Camera className="w-4 h-4" />
                          {editImagePreview ? 'Cambiar Foto' : 'Adjuntar Foto'}
                        </button>
                        {editImagePreview && (
                          <button
                            type="button"
                            onClick={() => { setEditImage(null); setEditImagePreview(null); }}
                            className="px-5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Quitar Foto
                          </button>
                        )}
                      </div>
                    </div>

                    {editImagePreview && (
                      <div className="relative w-full h-36 rounded-[1.5rem] overflow-hidden border border-white/10 group">
                        <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {editError && (
                      <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 text-red-400 text-xs animate-pulse">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-bold uppercase tracking-wider mb-1">Error al guardar cambios</p>
                          <p className="text-slate-400 font-medium leading-relaxed">{editError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                      className="flex-1 h-14 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editDescription.trim()}
                      className="flex-1 h-14 bg-brand-primary hover:bg-opacity-90 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Guardar Cambios</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => { setSelectedIncident(null); setIsEditing(false); }}
                      className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-all"
                    >
                      <AlertTriangle className="w-6 h-6 rotate-45" />
                    </button>
                  </div>

                  {selectedIncident.imageUrl && (
                    <div className="w-full h-64 overflow-hidden border-b border-white/5">
                      <img
                        src={selectedIncident.imageUrl}
                        alt="Evidencia"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-8 space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${selectedIncident.type === 'ROBO' ? 'bg-red-500' : selectedIncident.type === 'SOSPECHOSO' ? 'bg-orange-500' : selectedIncident.type === 'MARCAJE' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                          #{selectedIncident.id.slice(0, 12)}
                        </span>
                      </div>
                      <h2 className="text-3xl font-black text-white tracking-tighter leading-none mb-1 flex items-center gap-3">
                        {selectedIncident.type === 'ROBO' && <ShieldAlert className="w-8 h-8 text-red-500" />}
                        {selectedIncident.type === 'SOSPECHOSO' && <AlertTriangle className="w-8 h-8 text-orange-500" />}
                        {selectedIncident.type === 'MARCAJE' && <MapPin className="w-8 h-8 text-blue-500" />}
                        {selectedIncident.type === 'OTRO' && <Info className="w-8 h-8 text-slate-500" />}
                        {selectedIncident.type}
                      </h2>
                      <div className="flex items-center gap-3">
                        <p className="text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em]">{selectedIncident.isEdited ? 'Incidente Actualizado' : 'Incidente Reportado'}</p>
                        {selectedIncident.isEdited && (
                          <span className="text-[9px] font-black uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-md animate-pulse">
                            ✏️ Editado / Actualizado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl">
                      <p className="text-slate-300 text-sm leading-relaxed italic">
                        "{selectedIncident.description || 'Sin descripción adicional.'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 overflow-hidden">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reportero</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {reporterInfo?.displayName?.[0] || 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {reporterInfo?.displayName || 'Personal de Seguridad'}
                            </p>
                            <p className="text-[9px] text-slate-500 truncate">{reporterInfo?.email || selectedIncident.reporterId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Sede / Dealership</p>
                        <p className="text-xs font-mono text-white truncate">{selectedIncident.dealershipId || 'Central Coquimbo'}</p>
                      </div>
                    </div>

                    {/* Admin/Security/Owner Actions */}
                    {['ADMIN', 'OWNER', 'SECURITY'].includes(profile?.role || '') && (
                      <div className="flex flex-col gap-3 pt-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Gestión de Incidente</p>
                        <div className="flex gap-3">
                          {selectedIncident.status === 'OPEN' || !selectedIncident.status ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus('RESOLVED')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Resolver
                              </button>
                              <button
                                onClick={() => handleUpdateStatus('FALSE_ALARM')}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-2xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-white/5"
                              >
                                <Ban className="w-4 h-4" />
                                Falsa Alarma
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus('OPEN')}
                              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-2xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                            >
                              <AlertCircle className="w-4 h-4" />
                              Reabrir Incidente
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedIncident.reporterId === auth.currentUser?.uid && (
                      <div className="pt-2">
                        <button
                          onClick={startEditing}
                          className="w-full bg-slate-800/80 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-white/5 active:scale-[0.98]"
                        >
                          <Camera className="w-4 h-4 text-slate-400" />
                          Editar Reporte (Agregar Foto / Detalles)
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-500 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-[11px] font-bold font-mono">
                          {new Date(selectedIncident.createdAt).toLocaleString('es-CL')}
                        </span>
                      </div>
                      {selectedIncident.isEdited && selectedIncident.editedAt && (
                        <span className="text-[9px] font-bold font-mono text-brand-primary">
                          Actualizado: {new Date(selectedIncident.editedAt).toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <IncidentReportForm 
        isOpen={isReporting} 
        onClose={() => setIsReporting(false)} 
      />

      <RoadTestForm 
        isOpen={isRoadTestOpen} 
        onClose={() => setIsRoadTestOpen(false)} 
      />

      <InspectionForm 
        isOpen={isInspectionOpen} 
        onClose={() => setIsInspectionOpen(false)} 
      />

      <StockAutomotoras 
        isOpen={isStockOpen} 
        onClose={() => setIsStockOpen(false)} 
      />

      <BottomNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onTriggerAlert={() => window.dispatchEvent(new CustomEvent('open-flash-report'))} 
      />
    </div>
  );
}

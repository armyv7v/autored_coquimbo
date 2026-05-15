import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  BarChart3, 
  Settings, 
  UserPlus, 
  MoreVertical, 
  UserMinus, 
  Shield, 
  Clock, 
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OWNER' | 'SECURITY';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: any;
}

interface Incident {
  type: string;
  status: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STATS' | 'USERS'>('STATS');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'OWNER' | 'SECURITY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (!profile || profile.role !== 'ADMIN') return;

    // Fetch Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    // Fetch Incidents for Stats
    const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snapshot) => {
      setIncidents(snapshot.docs.map(doc => doc.data() as Incident));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubIncidents();
    };
  }, [profile]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        status: currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' 
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (!profile || profile.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
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

  const pieData = Object.entries(statsByType).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: 'Abiertos', value: incidents.filter(i => i.status === 'OPEN').length },
    { name: 'Resueltos', value: incidents.filter(i => i.status === 'RESOLVED').length },
    { name: 'Falsa Alarma', value: incidents.filter(i => i.status === 'FALSE_ALARM').length },
  ];

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
    link.setAttribute('download', `usuarios_autored_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-brand-primary p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Panel de Administración</h1>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Control Centralizado y Auditoría de Seguridad</p>
        </div>

        <nav className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('STATS')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'STATS' ? 'bg-brand-primary text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Estadísticas
          </button>
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'USERS' ? 'bg-brand-primary text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
          >
            Usuarios
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
                { label: 'Total Usuarios', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Total Incidentes', value: incidents.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
                { label: 'Resolución', value: `${((incidents.filter(i => i.status === 'RESOLVED').length / (incidents.length || 1)) * 100).toFixed(0)}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Sedes Activas', value: 12, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} blur-3xl -mr-12 -mt-12 transition-all group-hover:scale-150 opacity-50`} />
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-4 relative z-10`} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 relative z-10">{stat.label}</p>
                  <p className="text-3xl font-black text-white relative z-10">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 self-start flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-primary" />
                  Distribución por Tipo
                </h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase' }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 self-start flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-primary" />
                  Estado de Resolución
                </h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#1e293b' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-900 border border-slate-800 p-4 rounded-3xl">
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-[10px] font-black text-white appearance-none uppercase tracking-widest focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="ALL">TODOS LOS ROLES</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">PROPIETARIO</option>
                    <option value="SECURITY">SEGURIDAD</option>
                  </select>
                </div>
                <div className="relative">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-[10px] font-black text-white appearance-none uppercase tracking-widest focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="ALL">TODOS LOS ESTADOS</option>
                    <option value="ACTIVE">ACTIVOS</option>
                    <option value="SUSPENDED">SUSPENDIDOS</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleExportCSV}
                className="w-full lg:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-slate-700 shadow-lg shadow-black/20"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rol</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sede</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
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
                                <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <select 
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.uid, e.target.value)}
                              className="bg-slate-800 text-[10px] font-black text-white px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-brand-primary uppercase tracking-widest transition-all cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="OWNER">PROPIETARIO</option>
                              <option value="SECURITY">SEGURIDAD</option>
                            </select>
                          </td>
                          <td className="p-6">
                            <span className="text-[10px] font-bold text-slate-400">Chile Motors Coquimbo</span>
                          </td>
                          <td className="p-6">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {user.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              onClick={() => handleToggleStatus(user.uid, user.status || 'ACTIVE')}
                              className={`p-2 rounded-xl transition-all ${user.status === 'SUSPENDED' ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-red-500 bg-red-500/10 hover:bg-red-500/20'}`}
                              title={user.status === 'SUSPENDED' ? 'Activar Usuario' : 'Suspender Usuario'}
                            >
                              {user.status === 'SUSPENDED' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <Users className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-50" />
                          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No se encontraron usuarios</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Mostrando <span className="text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> de <span className="text-white">{filteredUsers.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-brand-primary text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white bg-slate-800/50'}`}
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
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

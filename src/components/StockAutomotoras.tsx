import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { Car, CheckCircle2, Plus, Search, Trash2, X, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { TacticalSubmitBar } from './ui/TacticalActionCard';

interface StockAutomotorasProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StockVehicle {
  id: string;
  dealershipId: string;
  dealershipName: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  status: 'DISPONIBLE' | 'NEGOCIACION' | 'VENDIDO';
  createdByUid: string;
  createdAt?: any;
}

interface DealershipDoc {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<StockVehicle['status'], string> = {
  DISPONIBLE: 'Disponible',
  NEGOCIACION: 'En negociación',
  VENDIDO: 'Vendido',
};

const STATUS_BADGE: Record<StockVehicle['status'], string> = {
  DISPONIBLE: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  NEGOCIACION: 'text-amber-700 bg-amber-50 ring-amber-200',
  VENDIDO: 'text-slate-600 bg-slate-100 ring-slate-200',
};

const STATUS_OPTIONS = ['DISPONIBLE', 'NEGOCIACION', 'VENDIDO'] as const;

const priceBands = ['Todos', '< $12M', '$12M - $15M', '> $15M'];

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

const PublishCarIcon = ({ className = '' }: { className?: string }) => (
  <Car className={`${className} text-emerald-100`} />
);

export default function StockAutomotoras({ isOpen, onClose }: StockAutomotorasProps) {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<StockVehicle[]>([]);
  const [dealerships, setDealerships] = useState<DealershipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [year, setYear] = useState('Todos');
  const [priceBand, setPriceBand] = useState('Todos');

  // Publicar vehículo
  const [isPublishing, setIsPublishing] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStatus, setFormStatus] = useState<StockVehicle['status']>('DISPONIBLE');
  const [formDealershipId, setFormDealershipId] = useState('');
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const canPublish = profile?.role === 'ADMIN' || profile?.role === 'OWNER';

  useEffect(() => {
    if (!isOpen) return;
    setStockError(null);
    const unsubVehicles = onSnapshot(
      query(collection(db, 'stockVehicles'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setVehicles(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<StockVehicle, 'id'>) })));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading stock:', error);
        setStockError('No se pudo cargar el stock de la red. Verifica tu conexión.');
        setLoading(false);
      }
    );
    const unsubDealerships = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
      setDealerships(snapshot.docs.map(d => ({ id: d.id, name: (d.data() as any).name || d.id })));
    });
    return () => {
      unsubVehicles();
      unsubDealerships();
    };
  }, [isOpen]);

  const years = useMemo(() => {
    const unique = new Set<number>();
    vehicles.forEach(v => unique.add(v.year));
    return ['Todos', ...Array.from(unique).sort((a, b) => b - a).map(String)];
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const haystack = `${vehicle.brand} ${vehicle.model} ${vehicle.dealershipName}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesYear = year === 'Todos' || String(vehicle.year) === year;
      const matchesPrice =
        priceBand === 'Todos' ||
        (priceBand === '< $12M' && vehicle.price < 12000000) ||
        (priceBand === '$12M - $15M' && vehicle.price >= 12000000 && vehicle.price <= 15000000) ||
        (priceBand === '> $15M' && vehicle.price > 15000000);
      return matchesSearch && matchesYear && matchesPrice;
    });
  }, [priceBand, search, vehicles, year]);

  const resetForm = () => {
    setBrand('');
    setModel('');
    setFormYear('');
    setFormPrice('');
    setFormStatus('DISPONIBLE');
  };

  const handlePublish = async () => {
    if (isSavingVehicle) return;
    setStockError(null);
    const parsedYear = parseInt(formYear, 10);
    const parsedPrice = parseInt(formPrice.replace(/[^\d]/g, ''), 10);
    const dealershipId = profile?.dealershipId || formDealershipId;
    const dealershipName = dealerships.find(d => d.id === dealershipId)?.name || dealershipId;

    if (!brand.trim() || !model.trim()) {
      setStockError('Completa la marca y el modelo del vehículo.');
      return;
    }
    if (!dealershipId) {
      setStockError('No se pudo determinar la sede. Selecciona una automotora.');
      return;
    }
    if (Number.isNaN(parsedYear) || parsedYear < 1950 || parsedYear > 2030) {
      setStockError('El año debe estar entre 1950 y 2030.');
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setStockError('Ingresa un precio válido en pesos chilenos.');
      return;
    }

    setIsSavingVehicle(true);
    try {
      await addDoc(collection(db, 'stockVehicles'), {
        dealershipId,
        dealershipName,
        brand: brand.trim(),
        model: model.trim(),
        year: parsedYear,
        price: parsedPrice,
        status: formStatus,
        createdByUid: auth.currentUser?.uid || '',
        createdAt: serverTimestamp(),
      });
      resetForm();
      setIsPublishing(false);
    } catch (error) {
      console.error('Error publishing vehicle:', error);
      setStockError('No se pudo publicar el vehículo. Si el problema persiste, avisa al administrador de la red.');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleDelete = async (vehicle: StockVehicle) => {
    if (!window.confirm(`¿Eliminar el ${vehicle.brand} ${vehicle.model} del stock de la red?`)) return;
    setStockError(null);
    try {
      await deleteDoc(doc(db, 'stockVehicles', vehicle.id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setStockError('No se pudo eliminar el vehículo. Intentalo de nuevo.');
    }
  };

  const canDelete = (vehicle: StockVehicle) =>
    vehicle.createdByUid === auth.currentUser?.uid || profile?.role === 'ADMIN';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2150] overflow-y-auto bg-slate-950/92 p-3 backdrop-blur-md sm:p-5"
        >
          <div className="min-h-full flex items-center justify-center">
            <motion.section
              initial={{ opacity: 0, y: 34, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 34, scale: 0.97 }}
              className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.4rem] border border-slate-200 bg-white text-slate-900 shadow-[0_0_30px_rgba(16,185,129,0.12)] max-h-[92vh]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,.2),transparent_34%),radial-gradient(circle_at_100%_10%,rgba(16,185,129,.15),transparent_30%)]" />
              <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-5 sm:p-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-emerald-300 bg-emerald-100 shadow-md shadow-emerald-100 shrink-0">
                    <Car className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[.28em] text-emerald-700">Automotoras en red</p>
                    <h2 className="text-2xl font-black tracking-[-.06em] text-slate-900">Stock automotoras</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canPublish && (
                    <button
                      type="button"
                      onClick={() => setIsPublishing(prev => !prev)}
                      className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3.5 py-2 font-mono text-[11px] font-black uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-900 active:scale-[0.98]"
                      aria-expanded={isPublishing}
                    >
                      <Plus className="h-4 w-4" />
                      {isPublishing ? 'Cerrar' : 'Publicar Vehículo'}
                    </button>
                  )}
                  <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar stock">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </header>

              {isPublishing && (
                <div className="relative border-b border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {!profile?.dealershipId && (
                      <label className="relative block lg:col-span-2">
                        <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">Sede</span>
                        <select
                          value={formDealershipId}
                          onChange={(e) => setFormDealershipId(e.target.value)}
                          className="h-12 w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500/60"
                        >
                          <option value="" className="bg-white text-slate-900">Seleccionar automotora…</option>
                          {dealerships.map(d => (
                            <option key={d.id} value={d.id} className="bg-white text-slate-900">{d.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="relative block">
                      <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">Marca</span>
                      <input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Toyota"
                        autoCapitalize="words"
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60"
                      />
                    </label>
                    <label className="relative block">
                      <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">Modelo</span>
                      <input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Corolla Cross"
                        autoCapitalize="words"
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60"
                      />
                    </label>
                    <label className="relative block">
                      <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">Año</span>
                      <input
                        value={formYear}
                        onChange={(e) => setFormYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                        placeholder="2022"
                        inputMode="numeric"
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60"
                      />
                    </label>
                    <label className="relative block">
                      <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">Precio CLP</span>
                      <input
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                        placeholder="16490000"
                        inputMode="numeric"
                        className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormStatus(opt)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                            formStatus === opt ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          {STATUS_LABELS[opt]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TacticalSubmitBar
                    type="button"
                    icon={PublishCarIcon}
                    label="Publicar en la Red"
                    loading={isSavingVehicle}
                    loadingLabel="Publicando en la Red..."
                    tone="emerald"
                    onClick={handlePublish}
                  />
                </div>
              )}

              {stockError && (
                <div className="relative mx-4 mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-red-700 text-xs font-bold" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {stockError}
                </div>
              )}

              <div className="relative border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_170px]">
                  <label className="relative block">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscador general"
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </label>
                  <Select value={year} onChange={setYear} options={years} label="Año" />
                  <Select value={priceBand} onChange={setPriceBand} options={priceBands} label="Precio" />
                </div>
              </div>

              <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
                {loading ? (
                  <div className="grid h-full place-items-center text-slate-600 text-sm italic">Cargando stock de la red…</div>
                ) : filtered.length === 0 ? (
                  <div className="grid h-full place-items-center">
                    <div className="text-center max-w-sm">
                      <Car className="mx-auto mb-4 h-14 w-14 text-slate-400" />
                      <p className="text-sm font-bold text-slate-700">
                        {vehicles.length === 0 ? 'Aún no hay vehículos publicados en la red.' : 'Ningún vehículo coincide con los filtros.'}
                      </p>
                      {vehicles.length === 0 && canPublish && (
                        <p className="mt-2 text-xs text-slate-600">Usa “Publicar Vehículo” para agregar el primero.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((vehicle) => (
                      <article key={vehicle.id} className="group overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-emerald-300 hover:bg-slate-50">
                        <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <Car className="h-20 w-20 text-slate-400 transition group-hover:scale-110 group-hover:text-emerald-600" />
                          <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_BADGE[vehicle.status]}`}>
                            {STATUS_LABELS[vehicle.status] || vehicle.status}
                          </span>
                          {canDelete(vehicle) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(vehicle)}
                              aria-label={`Eliminar ${vehicle.brand} ${vehicle.model}`}
                              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-500 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-600">{vehicle.dealershipName}</p>
                            <h3 className="text-base font-black text-slate-900">
                              {vehicle.brand} {vehicle.model}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-600">{vehicle.year}</span>
                            {vehicle.status === 'DISPONIBLE' && (
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> En red
                              </span>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold text-slate-600">Precio red</p>
                            <p className="text-lg font-black text-slate-900">{formatPrice(vehicle.price)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <label className="relative block">
      <span className="absolute left-4 top-2 text-[11px] font-black uppercase tracking-[.2em] text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 pt-3.5 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-500/60"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-white text-slate-900">
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

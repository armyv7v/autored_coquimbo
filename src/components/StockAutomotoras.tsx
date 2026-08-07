import React, { useMemo, useState } from 'react';
import { Car, CheckCircle2, Menu, Search, Star, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface StockAutomotorasProps {
  isOpen: boolean;
  onClose: () => void;
}

const vehicles = [
  { id: 'AR-001', brand: 'Toyota', model: 'Corolla Cross', year: 2022, price: 16490000, dealer: 'Automotora Puerto Norte', rating: 4.8, status: 'Disponible' },
  { id: 'AR-002', brand: 'Hyundai', model: 'Tucson', year: 2021, price: 15180000, dealer: 'Coquimbo Motors', rating: 4.6, status: 'Disponible' },
  { id: 'AR-003', brand: 'Kia', model: 'Sportage', year: 2020, price: 13750000, dealer: 'Ovalle Autos', rating: 4.4, status: 'En negociación' },
  { id: 'AR-004', brand: 'Chevrolet', model: 'Tracker', year: 2023, price: 14290000, dealer: 'Ruta 5 Automotriz', rating: 4.9, status: 'Disponible' },
  { id: 'AR-005', brand: 'Nissan', model: 'Versa', year: 2022, price: 10390000, dealer: 'La Serena Car', rating: 4.5, status: 'Disponible' },
  { id: 'AR-006', brand: 'Suzuki', model: 'Vitara', year: 2019, price: 11980000, dealer: 'Bahía Autos', rating: 4.2, status: 'Disponible' },
  { id: 'AR-007', brand: 'Mazda', model: 'CX-5', year: 2021, price: 17870000, dealer: 'Automotora El Faro', rating: 4.7, status: 'En negociación' },
  { id: 'AR-008', brand: 'Peugeot', model: '3008', year: 2020, price: 14950000, dealer: 'Red Norte Vehículos', rating: 4.3, status: 'Disponible' },
];

const years = ['Todos', '2023', '2022', '2021', '2020', '2019'];
const priceBands = ['Todos', '< $12M', '$12M - $15M', '> $15M'];
const ratings = ['Todas', '4.8+', '4.5+', '4.0+'];

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

export default function StockAutomotoras({ isOpen, onClose }: StockAutomotorasProps) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('Todos');
  const [priceBand, setPriceBand] = useState('Todos');
  const [rating, setRating] = useState('Todas');

  const filtered = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const haystack = `${vehicle.brand} ${vehicle.model} ${vehicle.dealer}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesYear = year === 'Todos' || String(vehicle.year) === year;
      const matchesPrice =
        priceBand === 'Todos' ||
        (priceBand === '< $12M' && vehicle.price < 12000000) ||
        (priceBand === '$12M - $15M' && vehicle.price >= 12000000 && vehicle.price <= 15000000) ||
        (priceBand === '> $15M' && vehicle.price > 15000000);
      const matchesRating = rating === 'Todas' || vehicle.rating >= Number(rating.replace('+', ''));
      return matchesSearch && matchesYear && matchesPrice && matchesRating;
    });
  }, [priceBand, rating, search, year]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2150] flex items-center justify-center bg-slate-950/92 p-3 backdrop-blur-md sm:p-5"
        >
          <motion.section
            initial={{ opacity: 0, y: 34, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 34, scale: 0.97 }}
            className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.4rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,90,31,.18),transparent_34%),radial-gradient(circle_at_100%_10%,rgba(14,165,233,.13),transparent_30%)]" />
            <header className="relative flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-brand-primary/35 bg-brand-primary/15">
                  <Car className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.28em] text-brand-primary">Automotoras en red</p>
                  <h2 className="text-2xl font-black tracking-[-.06em] text-white">Stock automotoras</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Menú de stock">
                  <Menu className="h-5 w-5" />
                </button>
                <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar stock">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="relative border-b border-white/10 p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_170px_140px]">
                <label className="relative block">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscador general"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/75 pl-12 pr-4 text-sm text-white outline-none transition focus:border-brand-primary/60 focus:ring-4 focus:ring-brand-primary/10"
                  />
                </label>
                <Select value={year} onChange={setYear} options={years} label="Año" />
                <Select value={priceBand} onChange={setPriceBand} options={priceBands} label="Precio" />
                <Select value={rating} onChange={setRating} options={ratings} label="Calificación" />
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((vehicle) => (
                  <article key={vehicle.id} className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[.045] transition hover:-translate-y-1 hover:border-brand-primary/35 hover:bg-white/[.07]">
                    <div className="relative grid aspect-[4/3] place-items-center bg-[linear-gradient(135deg,rgba(15,23,42,.9),rgba(30,41,59,.62))]">
                      <Car className="h-20 w-20 text-white/35 transition group-hover:scale-110 group-hover:text-brand-primary/70" />
                      <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black text-white ring-1 ring-white/10">{vehicle.id}</span>
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black text-amber-200 ring-1 ring-amber-300/20">
                        <Star className="h-3 w-3 fill-amber-200" /> {vehicle.rating}
                      </span>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="text-lg font-black tracking-[-.04em] text-white">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-xs text-slate-500">{vehicle.year} · {vehicle.dealer}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-sm font-black text-brand-primary">{formatPrice(vehicle.price)}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] ${vehicle.status === 'En negociación' ? 'bg-sky-400/15 text-sky-200' : 'bg-emerald-400/15 text-emerald-200'}`}>
                          {vehicle.status}
                        </span>
                      </div>
                      <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 py-3 text-xs font-black uppercase tracking-[.16em] text-slate-200 transition hover:border-brand-primary/35 hover:text-white">
                        <CheckCircle2 className="h-4 w-4" /> Solicitar negocio
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="relative border-t border-white/10 bg-slate-950/90 p-4 text-xs leading-5 text-slate-400 sm:p-5">
              Sistema de calificación entre partes: si una automotora muestra interés, el vehículo pasa a estado “en negociación” por 48 horas. Si no hay respuesta, se notifica para confirmar el estado actual.
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/75 px-4 text-sm font-bold text-white outline-none transition focus:border-brand-primary/60 focus:ring-4 focus:ring-brand-primary/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

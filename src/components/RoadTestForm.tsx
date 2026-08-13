import React, { useMemo, useRef, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, Check, FileText, Loader2, Route, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { safeUUID } from '../lib/uuid';

interface RoadTestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type PhotoKey = 'licenseFront' | 'licenseBack' | 'driverPhoto' | 'vehiclePhoto';

const photoFields: Array<{ key: PhotoKey; label: string; helper: string }> = [
  { key: 'licenseFront', label: 'Foto RUT Delantero', helper: 'Carnet parte delantera' },
  { key: 'licenseBack', label: 'Foto RUT Trasero', helper: 'Carnet parte trasera' },
  { key: 'driverPhoto', label: 'Foto Persona/Conductor', helper: 'Persona que conducirá' },
  { key: 'vehiclePhoto', label: 'Foto Vehículo Prueba', helper: 'Condiciones de vehículo a probar' },
];

export default function RoadTestForm({ isOpen, onClose }: RoadTestFormProps) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<Record<PhotoKey, File | null>>({
    licenseFront: null,
    licenseBack: null,
    driverPhoto: null,
    vehiclePhoto: null,
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<Record<PhotoKey, HTMLInputElement | null>>({
    licenseFront: null,
    licenseBack: null,
    driverPhoto: null,
    vehiclePhoto: null,
  });

  const ready = useMemo(() => Boolean(files.licenseFront && files.licenseBack && files.driverPhoto), [files]);

  const setFile = (key: PhotoKey, file: File | null) => {
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const reset = () => {
    setFiles({ licenseFront: null, licenseBack: null, driverPhoto: null, vehiclePhoto: null });
    setNotes('');
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || !auth.currentUser) return;

    setSaving(true);
    setError('');
    try {
      const roadTestId = safeUUID();
      const uploads = await Promise.all(
        photoFields.map(async ({ key }) => {
          const file = files[key];
          if (!file) return [key, ''];
          const storageRef = ref(storage, `road-tests/${roadTestId}/${key}-${safeUUID()}-${file.name}`);
          const result = await uploadBytes(storageRef, file);
          return [key, await getDownloadURL(result.ref)];
        })
      );

      await setDoc(doc(collection(db, 'roadTests'), roadTestId), {
        id: roadTestId,
        dealershipId: profile?.dealershipId || 'DASHBOARD_UI',
        reporterId: auth.currentUser.uid,
        status: 'ACTIVE',
        notes: notes.trim(),
        files: Object.fromEntries(uploads),
        createdAt: serverTimestamp(),
      });

      reset();
      onClose();
    } catch (err) {
      console.error('Road test save error:', err);
      setError('No pudimos registrar la prueba en ruta. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2100] overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md"
        >
          <div className="min-h-full flex items-center justify-center">
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 42, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 42, scale: 0.96 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[2.35rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50 flex flex-col max-h-[95vh]"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(255,90,31,.18),transparent_36%),radial-gradient(circle_at_90%_110%,rgba(14,165,233,.12),transparent_36%)]" />
            <header className="relative flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-primary p-3 shadow-lg shadow-brand-primary/25">
                  <Route className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-[-.04em] text-white">PRUEBA EN RUTA</h2>
                  <p className="text-xs font-black uppercase tracking-[.25em] text-slate-400">Respaldo previo a salida</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative flex-1 min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs leading-5 text-red-100">
                <strong className="block text-xs uppercase font-black tracking-[.28em] text-red-200 mb-1">NOTAS</strong>
                Cada Prueba en Ruta queda registrada por seguridad y respaldo en caso de algún imprevisto.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {photoFields.map((field) => {
                  const selected = files[field.key];
                  return (
                    <div key={field.key} className="rounded-2xl border border-white/10 bg-white/[.04] p-3">
                      <input
                        ref={(node) => { inputsRef.current[field.key] = node; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => setFile(field.key, event.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => inputsRef.current[field.key]?.click()}
                        className={`flex min-h-24 w-full flex-col items-start justify-between rounded-xl border p-4 text-left transition active:scale-[.98] ${selected ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-brand-primary/35'}`}
                      >
                        <span className="flex w-full items-center justify-between gap-3">
                          <Camera className="h-5 w-5 text-slate-400" />
                          {selected ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/30">
                              <Check className="h-3.5 w-3.5" /> [✓]
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-400 border border-amber-500/20">
                              [✗]
                            </span>
                          )}
                        </span>
                        <span>
                          <span className="block text-xs font-black uppercase tracking-wider">{field.label}</span>
                          <span className="mt-1 block text-xs text-slate-400">{selected ? selected.name : field.helper}</span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-slate-400">
                  <FileText className="h-4 w-4" /> Observaciones
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: Cliente sin su documentación al día, Prueba la realizarán 2 conductores, Cliente sin experiencia de manejo..."
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white outline-none transition focus:border-brand-primary/60 focus:ring-4 focus:ring-brand-primary/10"
                />
              </label>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs leading-relaxed text-blue-200 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs uppercase font-black tracking-widest text-blue-300">Respaldo Automático de Seguridad</strong>
                  Cada viaje queda registrado en su totalidad con ID propio en su panel de control como respaldo de algún siniestro.
                </div>
              </div>

              {error && <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

              <button
                type="submit"
                disabled={!ready || saving}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-brand-primary font-black uppercase tracking-[.18em] text-white shadow-xl shadow-brand-primary/20 transition hover:bg-orange-600 active:scale-[.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Iniciar Prueba en Ruta
              </button>
            </div>
          </motion.form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

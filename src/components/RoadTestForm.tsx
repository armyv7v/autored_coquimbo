import React, { useMemo, useRef, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, Check, FileText, Loader2, Route, ShieldCheck, X, Car, Image as ImageIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { safeUUID } from '../lib/uuid';

interface RoadTestFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type PhotoKey = 'licenseFront' | 'licenseBack' | 'driverPhoto' | 'vehiclePhoto';

const photoFields: Array<{ key: PhotoKey; label: string; helper: string; guideText: string }> = [
  { key: 'licenseFront', label: 'RUT Delantero', helper: 'Carnet de conducir frente', guideText: 'Ubicar documento centrado' },
  { key: 'licenseBack', label: 'RUT Reverso', helper: 'Carnet parte trasera', guideText: 'Texto y firmas legibles' },
  { key: 'driverPhoto', label: 'Conductor / Cliente', helper: 'Foto frontal de la persona', guideText: 'Rostro descubierto' },
  { key: 'vehiclePhoto', label: 'Vehículo Prueba', helper: 'Estado inicial / Patente', guideText: 'Vista diagonal delantera' },
];

export default function RoadTestForm({ isOpen, onClose }: RoadTestFormProps) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<Record<PhotoKey, File | null>>({
    licenseFront: null,
    licenseBack: null,
    driverPhoto: null,
    vehiclePhoto: null,
  });
  const [previews, setPreviews] = useState<Record<PhotoKey, string | null>>({
    licenseFront: null,
    licenseBack: null,
    driverPhoto: null,
    vehiclePhoto: null,
  });
  const [plate, setPlate] = useState('');
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

  const handleFileSelect = (key: PhotoKey, file: File | null) => {
    if (file) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(15);
      }
      setFiles((prev) => ({ ...prev, [key]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({ ...prev, [key]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setFiles((prev) => ({ ...prev, [key]: null }));
      setPreviews((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
    setPlate(val);
  };

  const reset = () => {
    setFiles({ licenseFront: null, licenseBack: null, driverPhoto: null, vehiclePhoto: null });
    setPreviews({ licenseFront: null, licenseBack: null, driverPhoto: null, vehiclePhoto: null });
    setPlate('');
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
        vehiclePlate: plate.trim(),
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
          className="fixed inset-0 z-[2100] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4"
        >
          {/* Backdrop Click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-[2rem] sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="flex sm:hidden justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
            </div>

            {/* Header */}
            <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Route className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    PRUEBA EN RUTA
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">TEST DRIVE</span>
                  </h2>
                  <p className="text-xs text-slate-400">Registro fotográfico preventivo previo a salida</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Form Body (Scrollable) */}
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5 text-left">
              {/* Patente Vehículo */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Patente del Vehículo (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Car className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={plate}
                    onChange={handlePlateChange}
                    placeholder="Ej: AB-CD-12"
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono tracking-widest text-white uppercase placeholder:text-slate-600 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 outline-none transition"
                  />
                </div>
              </div>

              {/* Photo Capture Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Captura Guiada (3 Obligatorias)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {Object.values(files).filter(Boolean).length}/4 fotos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {photoFields.map((field) => {
                    const selected = files[field.key];
                    const preview = previews[field.key];
                    return (
                      <div key={field.key} className="relative rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 flex flex-col justify-between">
                        <input
                          ref={(node) => { inputsRef.current[field.key] = node; }}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(event) => handleFileSelect(field.key, event.target.files?.[0] || null)}
                        />

                        {preview ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-emerald-500/30 mb-2 group">
                            <img src={preview} alt={field.label} className="w-full h-full object-cover" />
                            <div 
                              onClick={() => inputsRef.current[field.key]?.click()}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                            >
                              <span className="text-[10px] font-bold uppercase text-white bg-slate-900/80 px-2 py-1 rounded">Cambiar</span>
                            </div>
                            <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                              <Check className="w-3 h-3" /> OK
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => inputsRef.current[field.key]?.click()}
                            className="w-full h-24 rounded-lg border border-dashed border-slate-700 bg-slate-900 hover:border-amber-500/50 flex flex-col items-center justify-center gap-1 mb-2 text-slate-400 hover:text-amber-400 transition"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-[10px] font-medium font-mono text-slate-500">{field.guideText}</span>
                          </button>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200">{field.label}</span>
                            {selected ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-amber-500/40" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 line-clamp-1">{field.helper}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Observaciones / Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ej: Acompañante presente, ruta fijada hacia La Herradura..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-500/60 transition"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>

            {/* Footer Actions (Sticky Bottom) */}
            <footer className="border-t border-slate-800/80 bg-slate-950 p-4">
              <button
                type="submit"
                disabled={!ready || saving}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-amber-500 font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Registrar Salida de Prueba
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

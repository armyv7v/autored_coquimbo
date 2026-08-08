import React, { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AlertTriangle, Check, Loader2, Mic, Send, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { safeUUID } from '../lib/uuid';

interface InspectionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const agencies = [
  'SII',
  'Municipalidad / patentes',
  'Inspección del trabajo',
  'Sernac',
  'Carabineros',
  'Seremi de salud',
  'SEC',
];

export default function InspectionForm({ isOpen, onClose }: InspectionFormProps) {
  const { profile } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ready = selected.length > 0 || message.trim().length > 0;
  const selectedText = useMemo(() => selected.join(', '), [selected]);

  const toggle = (agency: string) => {
    setSelected((current) =>
      current.includes(agency) ? current.filter((item) => item !== agency) : [...current, agency]
    );
  };

  const reset = () => {
    setSelected([]);
    setMessage('');
    setConfirming(false);
    setError('');
  };

  const send = async () => {
    if (!auth.currentUser || !ready) return;
    setSaving(true);
    setError('');
    try {
      const inspectionId = safeUUID();
      await setDoc(doc(collection(db, 'inspectionAlerts'), inspectionId), {
        id: inspectionId,
        agencies: selected,
        message: message.trim(),
        dealershipId: profile?.dealershipId || 'DASHBOARD_UI',
        reporterId: auth.currentUser.uid,
        status: 'SENT',
        createdAt: serverTimestamp(),
      });
      reset();
      onClose();
    } catch (err) {
      console.error('Inspection alert error:', err);
      setError('No pudimos enviar la alerta de fiscalización. Intenta nuevamente.');
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
          className="fixed inset-0 z-[2200] overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md"
        >
          <div className="min-h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 42, scale: 0.96 }}
            className="relative w-full max-w-xl overflow-hidden rounded-[2.35rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50 flex flex-col max-h-[95vh]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(16,185,129,.17),transparent_36%),radial-gradient(circle_at_95%_110%,rgba(255,90,31,.12),transparent_32%)]" />
            <header className="relative flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-black tracking-[-.04em] text-white">Fiscalización</h2>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[.25em] text-slate-500">alerta entre automotoras</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative flex-1 min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-xs leading-5 text-red-100">
                <strong className="block text-[10px] uppercase tracking-[.28em] text-red-200 mb-1">Nota</strong>
                Selecciona todas las entidades que te fiscalizaron y alerta a las demás automotoras para que estén preparadas. Puedes elegir más de una opción simultáneamente.
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {agencies.map((agency) => {
                  const active = selected.includes(agency);
                  return (
                    <button
                      key={agency}
                      type="button"
                      onClick={() => toggle(agency)}
                      className={`min-h-24 rounded-2xl border p-3 text-sm font-black transition active:scale-[.98] ${active ? 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100' : 'border-white/10 bg-white/[.04] text-slate-300 hover:border-brand-primary/35 hover:bg-white/[.07]'}`}
                    >
                      <span className="mb-3 flex items-center justify-between gap-2">
                        <ShieldCheck className="h-5 w-5 text-brand-primary" />
                        {active && <Check className="h-4 w-4 text-emerald-300" />}
                      </span>
                      <span className="block text-left leading-5">{agency}</span>
                    </button>
                  );
                })}
              </div>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-slate-500">
                  <Mic className="h-4 w-4" /> Mensaje
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Escribe un mensaje personalizado o pega una transcripción de nota de voz. Ej: pidieron libro de asistencia y documentos tributarios."
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white outline-none transition focus:border-brand-primary/60 focus:ring-4 focus:ring-brand-primary/10"
                />
              </label>

              {confirming && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-white/10 bg-slate-900/90 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[.24em] text-brand-primary">Seleccionaste</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedText || 'Mensaje personalizado sin entidad seleccionada'}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setConfirming(false)} className="rounded-2xl border border-white/10 py-3 text-xs font-black uppercase tracking-[.16em] text-slate-300 transition hover:bg-white/10">
                      Seleccionar más
                    </button>
                    <button type="button" onClick={send} disabled={saving} className="rounded-2xl bg-brand-primary py-3 text-xs font-black uppercase tracking-[.16em] text-white transition hover:bg-orange-600 disabled:opacity-60">
                      {saving ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </motion.div>
              )}

              {error && <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

              {!confirming && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!ready}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-brand-primary font-black uppercase tracking-[.18em] text-white shadow-xl shadow-brand-primary/20 transition hover:bg-orange-600 active:scale-[.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"
                >
                  <Send className="h-5 w-5" /> Enviar
                </button>
              )}
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

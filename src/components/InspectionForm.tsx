import React, { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Loader2, Mic, Send, ShieldCheck, X } from 'lucide-react';
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
          className="fixed inset-0 z-[2200] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4"
        >
          {/* Backdrop Click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-[2rem] sm:rounded-2xl border-2 border-sky-500/90 bg-slate-950 shadow-[0_0_50px_rgba(14,165,233,0.4)] overflow-hidden"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="flex sm:hidden justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-sky-500/50" />
            </div>

            <header className="flex items-center justify-between border-b border-sky-500/30 bg-gradient-to-r from-sky-950/50 via-slate-950 to-slate-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 shadow-md shadow-sky-950">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    FISCALIZACIÓN
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold">ALERTA RED</span>
                  </h2>
                  <p className="text-xs text-sky-300/80">Notificar presencia de fiscalizadores a la red</p>
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

            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5 text-left">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Entidades Fiscalizadoras (Selección Múltiple)
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {agencies.map((agency) => {
                    const active = selected.includes(agency);
                    return (
                      <button
                        key={agency}
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                            navigator.vibrate?.(10);
                          }
                          toggle(agency);
                        }}
                        className={`min-h-[4rem] rounded-xl border p-2.5 text-xs font-semibold transition active:scale-[0.98] flex flex-col justify-between text-left ${
                          active
                            ? 'border-sky-500/50 bg-sky-500/15 text-sky-200 shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`w-2 h-2 rounded-full ${active ? 'bg-sky-400' : 'bg-slate-700'}`} />
                          {active && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                        <span className="leading-tight mt-1">{agency}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-slate-400" />
                  Detalles o Requerimientos
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ej: Están solicitando libros de asistencia, contratos y patentes al día..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500/60 transition"
                />
              </div>

              {confirming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3.5"
                >
                  <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400">Resumen de Alerta</p>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed font-mono">
                    {selectedText || 'Mensaje general de fiscalización sin entidad específica'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 transition"
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      onClick={send}
                      disabled={saving}
                      className="rounded-xl bg-sky-500 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-sky-400 transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {saving ? 'Emitiendo...' : 'Confirmar Envío'}
                    </button>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>

            {!confirming && (
              <footer className="border-t border-slate-800/80 bg-slate-950 p-4">
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!ready}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" /> Emitir Alerta a la Red
                </button>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

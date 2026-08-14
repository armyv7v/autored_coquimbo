import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, X, Send, AlertTriangle, FileText, Loader2, Check, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getGeohash, COQUIMBO_CENTER } from '../lib/geoutils';
import { safeUUID } from '../lib/uuid';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface AlertConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDetailedReport?: () => void;
}

const COUNTDOWN_SECONDS = 10;

export default function AlertConfirmationModal({
  isOpen,
  onClose,
  onOpenDetailedReport,
}: AlertConfirmationModalProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [location, setLocation] = useState<[number, number]>(COQUIMBO_CENTER);
  const { profile } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Capture GPS on open
  useEffect(() => {
    if (isOpen) {
      setCountdown(COUNTDOWN_SECONDS);
      setIsSending(false);
      setSentSuccess(false);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation([pos.coords.latitude, pos.coords.longitude]);
          },
          (err) => {
            console.warn('Panic GPS error:', err);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, [isOpen]);

  const dispatchAlert = async () => {
    if (isSending || sentSuccess) return;
    setIsSending(true);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const geohash = getGeohash(location[0], location[1]);
      const incidentId = safeUUID();
      const alertId = safeUUID();
      const currentUserId = auth.currentUser?.uid || profile?.uid || 'PANIC_TRIGGER';

      const incidentData = {
        id: incidentId,
        type: 'ROBO',
        description: '🚨 ALERTA MÁXIMA / BOTÓN DE PÁNICO ACTIVADO EN AUTOMOTORA',
        reporterId: currentUserId,
        dealershipId: profile?.dealershipId || 'CENTRAL_COQUIMBO',
        location: { lat: location[0], lng: location[1], geohash },
        imageUrl: '',
        status: 'OPEN',
        isPanic: true,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'incidents', incidentId), incidentData);

      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        incidentId: incidentId,
        createdAt: serverTimestamp(),
        triggeredManually: true,
        triggeredBy: currentUserId,
        notifiedDealershipIds: [],
      });

      setSentSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      console.error('Error in dispatchPanicAlert:', err);
      handleFirestoreError(err, OperationType.WRITE, 'incidents');
      setIsSending(false);
    }
  };

  // Countdown timer logic
  useEffect(() => {
    if (!isOpen || isSending || sentSuccess) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          dispatchAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isSending, sentSuccess, location, profile]);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const handleOpenReport = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (onOpenDetailedReport) {
      onOpenDetailedReport();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const progressPercent = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl select-none"
      >
        <motion.div
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 20 }}
          className="bg-slate-950 border-2 border-red-500 w-full max-w-sm rounded-[2.5rem] p-6 text-center shadow-[0_0_80px_rgba(220,38,38,0.5)] relative overflow-hidden"
        >
          {/* Pulsing red ambient aura */}
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/20 via-transparent to-red-950/40 pointer-events-none animate-pulse" />

          {sentSuccess ? (
            <div className="py-6 space-y-4 relative z-10">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                ¡Alerta Emitida a la Red!
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Todos los nodos y automotoras han sido notificados.
              </p>
            </div>
          ) : (
            <div className="space-y-5 relative z-10">
              {/* Giant Countdown Radial Circle */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="stroke-red-600 transition-all duration-1000 ease-linear"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                    {countdown}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-red-400 font-bold tracking-widest">
                    Segundos
                  </span>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-2 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  Botón de Pánico Activo
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Alerta Máxima Inminente
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Se transmitirá la emergencia a toda la red al terminar el conteo.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Immediate Dispatch Button */}
                <button
                  type="button"
                  onClick={dispatchAlert}
                  disabled={isSending}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-black uppercase tracking-wider shadow-xl shadow-red-950 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar de Inmediato
                    </>
                  )}
                </button>

                {/* Cancel False Alarm Button */}
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  Cancelar (Falsa Alarma)
                </button>

                {/* Optional Detailed Report */}
                {onOpenDetailedReport && (
                  <button
                    type="button"
                    onClick={handleOpenReport}
                    className="w-full py-2 text-[11px] font-mono text-slate-400 hover:text-white transition underline underline-offset-4"
                  >
                    Detallar reporte (Foto / Info)
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
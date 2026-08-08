import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlertConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AlertConfirmationModal({ isOpen, onClose, onConfirm }: AlertConfirmationModalProps) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    let timer: any = null;
    if (isOpen) {
      setSeconds(5);
      timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onConfirm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl select-none"
      >
        <motion.div
          initial={{ scale: 0.85, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 20 }}
          className="bg-slate-900 border-2 border-red-500/50 w-full max-w-md rounded-[2.5rem] p-6 text-center shadow-2xl shadow-red-950/80 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header Warning Icon */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center animate-bounce text-red-500">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2">
            Confirmación de Alerta Máxima
          </h3>

          <p className="text-xs text-slate-300 mb-5 font-medium leading-relaxed">
            Se enviará una notificación crítica de alta prioridad a todas las automotoras de la red en:
          </p>

          {/* 5-Second Countdown Ring */}
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-red-500 transition-all duration-1000 ease-linear"
                strokeDasharray={`${(seconds / 5) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-black text-4xl text-white font-display">
              {seconds}s
            </span>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest border border-slate-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-400" />
              Cancelar Alerta (Falsa Alarma)
            </button>

            <button
              onClick={onConfirm}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-950/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Disparar Inmediatamente
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

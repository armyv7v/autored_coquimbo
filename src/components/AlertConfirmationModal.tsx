import React from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlertConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function AlertConfirmationModal({ isOpen, onClose, onConfirm }: AlertConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 backdrop-blur-xl select-none"
      >
        <div className="min-h-full flex items-center justify-center p-4">
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
            Se enviará una notificación crítica de alta prioridad a todas las automotoras de la red. Esta acción requiere tu confirmación explícita.
          </p>

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
              Continuar al Reporte
            </button>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
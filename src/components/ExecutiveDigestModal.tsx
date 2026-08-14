import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Share2, Check, ShieldCheck, AlertTriangle, Building2, Calendar, Copy, ExternalLink } from 'lucide-react';
import { formatExecutiveDailyDigest, IncidentSummary } from '../lib/executiveReport';

interface ExecutiveDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: IncidentSummary[];
  dealershipsCount: number;
}

export default function ExecutiveDigestModal({
  isOpen,
  onClose,
  incidents,
  dealershipsCount,
}: ExecutiveDigestModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const digestText = formatExecutiveDailyDigest(incidents, dealershipsCount);

  const total = incidents.length;
  const robos = incidents.filter((i) => i.type === 'ROBO').length;
  const sospechosos = incidents.filter((i) => i.type === 'SOSPECHOSO').length;
  const marcajes = incidents.filter((i) => i.type === 'MARCAJE').length;
  const abiertos = incidents.filter((i) => i.status === 'OPEN' || !i.status).length;
  const resueltos = incidents.filter((i) => i.status === 'RESOLVED').length;

  const handleCopy = () => {
    navigator.clipboard.writeText(digestText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(digestText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-xl bg-slate-950 border-2 border-brand-primary/90 rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(255,107,0,0.4)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-brand-primary/30 flex items-center justify-between bg-gradient-to-r from-orange-950/50 via-slate-950 to-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center text-brand-primary shadow-md shadow-orange-950">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                  Minuta Ejecutiva de Seguridad
                </h3>
                <p className="text-xs text-brand-primary/80 font-mono">
                  Resumen de estado para Directorio y Gerencia
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Eventos</span>
                <span className="text-xl font-bold text-white tabular-nums">{total}</span>
              </div>
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
                <span className="text-[10px] font-mono uppercase text-red-400 block">Casos Abiertos</span>
                <span className="text-xl font-bold text-red-400 tabular-nums">{abiertos}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[10px] font-mono uppercase text-emerald-400 block">Resueltos</span>
                <span className="text-xl font-bold text-emerald-400 tabular-nums">{resueltos}</span>
              </div>
            </div>

            {/* Type Breakdown Cards */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Desglose por Tipología
              </span>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Robos / Asaltos
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{robos}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Movimientos Sospechosos
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{sospechosos}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Marcajes
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{marcajes}</span>
              </div>
            </div>

            {/* Formatted Text Preview */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                Texto Formateado para WhatsApp / Notificaciones
              </label>
              <pre className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                {digestText}
              </pre>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Minuta Copiada' : 'Copiar Texto'}
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Enviar a WhatsApp
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

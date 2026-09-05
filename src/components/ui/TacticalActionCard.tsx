/**
 * Lenguaje visual único de CTAs de Alerta Dealers, extraído de las
 * "Acciones Operativas" del Panel. Toda acción de entrada de módulo y todo
 * botón primario del sistema usa estos tokens (colores semánticos:
 * red = robo/alerta, amber = terreno/prueba, sky = fiscalización/ubicación,
 * emerald = inventario/éxito, slate = acción neutra).
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export type TacticalTone = 'red' | 'amber' | 'sky' | 'emerald' | 'slate';

interface ToneTokens {
  card: string;
  iconBox: string;
  eyebrow: string;
  arrow: string;
}

const TONES: Record<TacticalTone, ToneTokens> = {
  red: {
    card: 'border-red-500/70 hover:border-red-400 bg-gradient-to-br from-red-950/45 via-slate-900/90 to-slate-950 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]',
    iconBox: 'bg-red-500/20 border-red-500/60 text-red-400 group-hover:border-red-400 shadow-red-950',
    eyebrow: 'text-red-400',
    arrow: 'bg-red-500/10 border-red-500/30 text-red-400 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-400 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.5)]',
  },
  amber: {
    card: 'border-amber-500/70 hover:border-amber-400 bg-gradient-to-br from-amber-950/45 via-slate-900/90 to-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]',
    iconBox: 'bg-amber-500/20 border-amber-500/60 text-amber-400 group-hover:border-amber-400 shadow-amber-950',
    eyebrow: 'text-amber-400',
    arrow: 'bg-amber-500/10 border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-400 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]',
  },
  sky: {
    card: 'border-sky-500/70 hover:border-sky-400 bg-gradient-to-br from-sky-950/45 via-slate-900/90 to-slate-950 shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)]',
    iconBox: 'bg-sky-500/20 border-sky-500/60 text-sky-400 group-hover:border-sky-400 shadow-sky-950',
    eyebrow: 'text-sky-400',
    arrow: 'bg-sky-500/10 border-sky-500/30 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 group-hover:border-sky-400 group-hover:shadow-[0_0_12px_rgba(14,165,233,0.5)]',
  },
  emerald: {
    card: 'border-emerald-500/70 hover:border-emerald-400 bg-gradient-to-br from-emerald-950/45 via-slate-900/90 to-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]',
    iconBox: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 group-hover:border-emerald-400 shadow-emerald-950',
    eyebrow: 'text-emerald-400',
    arrow: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-emerald-400 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]',
  },
  slate: {
    card: 'border-slate-600/70 hover:border-slate-500 bg-gradient-to-br from-slate-800/60 via-slate-900/90 to-slate-950 shadow-[0_0_15px_rgba(148,163,184,0.12)] hover:shadow-[0_0_25px_rgba(148,163,184,0.2)]',
    iconBox: 'bg-slate-500/20 border-slate-500/60 text-slate-300 group-hover:border-slate-400 shadow-slate-950',
    eyebrow: 'text-slate-300',
    arrow: 'bg-slate-500/10 border-slate-500/30 text-slate-300 group-hover:bg-slate-500 group-hover:text-white group-hover:border-slate-400',
  },
};

const ARROW_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

interface TacticalActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  tone?: TacticalTone;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

/** Card de entrada de módulo: exactamente el diseño de "Acciones Operativas". */
export default function TacticalActionCard({
  icon: Icon,
  eyebrow,
  title,
  tone = 'sky',
  onClick,
  disabled,
  type = 'button',
  className = '',
}: TacticalActionCardProps) {
  const t = TONES[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tactical-card p-4 rounded-2xl flex items-center justify-between group border-2 ${t.card} text-left active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center group-hover:scale-105 transition-all shadow-md shrink-0 ${t.iconBox}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="truncate">
          <p className={`text-[11px] font-mono font-bold uppercase tracking-wider truncate ${t.eyebrow}`}>{eyebrow}</p>
          <p className="text-sm font-bold text-slate-100 truncate">{title}</p>
        </div>
      </div>
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center group-hover:scale-105 transition-all shrink-0 ml-2 ${t.arrow}`}>
        {ARROW_SVG}
      </div>
    </button>
  );
}

interface TacticalSubmitBarProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  loading?: boolean;
  loadingLabel?: string;
  tone?: TacticalTone;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

/** Barra de acción primaria (formularios y confirmaciones): el mismo lenguaje
 *  del Panel en formato barra completa, con spinner cuando está transmitiendo. */
export function TacticalSubmitBar({
  icon: Icon,
  label,
  loading = false,
  loadingLabel,
  tone = 'red',
  disabled,
  onClick,
  type = 'submit',
  className = '',
}: TacticalSubmitBarProps) {
  const t = TONES[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full p-3.5 rounded-2xl flex items-center justify-between group border-2 ${t.card} text-left active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center shrink-0 ${t.iconBox}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-100 truncate">
          {loading ? loadingLabel || label : label}
        </span>
      </div>
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${t.arrow}`}>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          ARROW_SVG
        )}
      </div>
    </button>
  );
}

import React from 'react';
import PantherLogo from './PantherLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950 border-t border-white/10 py-3.5 px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-300 select-none">
      <span className="flex items-center gap-3">
        <PantherLogo className="w-9 h-5 shrink-0" />
        <span className="font-medium tracking-wide">
          Powered by <strong className="text-white font-bold tracking-wide">Sistemas Pantera</strong>
        </span>
      </span>
      <span className="text-slate-500 text-xs tracking-wide">
        © {new Date().getFullYear()} Alerta Dealers — Red privada de seguridad para automotoras
      </span>
    </footer>
  );
}

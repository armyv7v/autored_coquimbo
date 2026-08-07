import React from 'react';
import PantherLogo from './PantherLogo';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-md border-t border-white/5 py-3.5 px-4 flex items-center justify-center gap-3 text-sm text-slate-300 select-none">
      <PantherLogo className="w-9 h-5 shrink-0" />
      <span className="font-medium tracking-wide">
        Powered by <strong className="text-white font-bold tracking-wide">Sistemas Pantera</strong>
      </span>
    </footer>
  );
}

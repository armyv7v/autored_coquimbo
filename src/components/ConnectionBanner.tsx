import { WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionBannerProps {
  show: boolean;
  label?: string;
}

/**
 * Banner global de suscripción Firestore caída (auditoría A-16): distingue
 * "no hay datos" de "la conexión falló" para que un fallo de red nunca se
 * lea como calma operativa. Firestore reintenta solo; el banner se apaga
 * cuando vuelve el primer snapshot exitoso.
 */
export default function ConnectionBanner({
  show,
  label = 'Sin conexión con la base de la red — reintentando automáticamente…',
}: ConnectionBannerProps) {
  if (!show) return null;
  return (
    <div
      className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider text-center"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
    </div>
  );
}

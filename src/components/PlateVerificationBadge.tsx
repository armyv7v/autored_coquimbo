import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Search, Loader2, AlertTriangle, Car, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { checkStolenVehiclePlate, StolenVehicleCheckResult } from '../services/stolenVehicleService';
import { validateChileanPlate } from '../lib/chileanPlates';
import { sound } from '../lib/soundEngine';

interface PlateVerificationBadgeProps {
  plate: string;
  onPlateChange?: (newPlate: string) => void;
  onStatusResolved?: (result: StolenVehicleCheckResult) => void;
  autoCheck?: boolean;
  compact?: boolean;
}

export default function PlateVerificationBadge({
  plate,
  onPlateChange,
  onStatusResolved,
  autoCheck = true,
  compact = false,
}: PlateVerificationBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StolenVehicleCheckResult | null>(null);
  const [lastCheckedPlate, setLastCheckedPlate] = useState('');

  const validation = validateChileanPlate(plate);

  const performCheck = async (plateToCheck: string) => {
    const clean = plateToCheck.trim();
    if (!clean || clean.length < 5) {
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const res = await checkStolenVehiclePlate(clean);
      setResult(res);
      setLastCheckedPlate(clean);
      if (onStatusResolved) {
        onStatusResolved(res);
      }
      if (res.hasStolenReport) {
        sound.playPoliceSiren(2.5);
      } else {
        sound.playNodePulse(false);
      }
    } catch (err) {
      console.error('Error checking plate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoCheck && validation.isValid && validation.normalized !== lastCheckedPlate) {
      const timer = setTimeout(() => {
        performCheck(validation.normalized);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [plate, autoCheck, validation.isValid, validation.normalized, lastCheckedPlate]);

  if (!plate && !result) {
    return null;
  }

  return (
    <div className="space-y-2 text-left">
      {/* Action Row if manual query */}
      {validation.isValid && !result && !loading && (
        <button
          type="button"
          onClick={() => performCheck(plate)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-sky-400 hover:bg-slate-800 transition active:scale-95"
        >
          <Search className="w-3.5 h-3.5" />
          Verificar en AutoSeguro / SEBV Carabineros
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 animate-pulse">
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
          <span>Consultando base nacional de encargo por robo (AutoSeguro / PDI)...</span>
        </div>
      )}

      {result && !loading && (
        <div
          className={`rounded-2xl border-2 p-3.5 transition-all ${
            result.hasStolenReport
              ? 'bg-red-950/60 border-red-500 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-in zoom-in-95'
              : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  result.hasStolenReport
                    ? 'bg-red-600 text-white shadow-md shadow-red-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950 font-bold'
                }`}
              >
                {result.hasStolenReport ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm tracking-wider uppercase">
                    {result.formattedPlate}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                      result.hasStolenReport
                        ? 'bg-red-500 text-white animate-bounce'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {result.hasStolenReport ? '¡ALERTA ROJA!' : 'SIN ENCARGO'}
                  </span>
                </div>
                <p className="text-[11px] font-mono font-bold mt-0.5">
                  {result.statusText}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => performCheck(plate)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              title="Volver a consultar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vehicle Details */}
          {result.vehicleDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 mt-2 border-t border-white/10 text-[11px] font-mono">
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Marca / Modelo</span>
                <span className="font-black text-white">{result.vehicleDetails.brand} {result.vehicleDetails.model}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Año</span>
                <span className="font-bold text-white">{result.vehicleDetails.year}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Color</span>
                <span className="font-bold text-white">{result.vehicleDetails.color}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Tipo</span>
                <span className="font-bold text-white">{result.vehicleDetails.vehicleType}</span>
              </div>
            </div>
          )}

          {/* Stolen Details Banner */}
          {result.stolenDetails && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-red-900/50 border border-red-500/50 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between text-red-200 font-bold">
                <span>Denuncia: {result.stolenDetails.reportNumber}</span>
                <span>{result.stolenDetails.policeAgency}</span>
              </div>
              <p className="text-[11px] text-red-300">
                Lugar: {result.stolenDetails.policeStation} • Comuna: {result.stolenDetails.commune}
              </p>
            </div>
          )}

          <div className="mt-2 text-[9px] font-mono text-slate-400 flex items-center justify-between">
            <span>Fuente: {result.source}</span>
            <span>Verificado: {new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs</span>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Search, Loader2, AlertTriangle, Car, ExternalLink, RefreshCw, CheckCircle2, Shield, PlusCircle } from 'lucide-react';
import { checkStolenVehiclePlate, setPlateStolenStatus, StolenVehicleCheckResult } from '../services/stolenVehicleService';
import { validateChileanPlate } from '../lib/chileanPlates';
import { sound } from '../lib/soundEngine';

interface PlateVerificationBadgeProps {
  plate: string;
  onPlateChange?: (newPlate: string) => void;
  onStatusResolved?: (result: StolenVehicleCheckResult) => void;
  autoCheck?: boolean;
  compact?: boolean;
  allowManualOverride?: boolean;
}

export default function PlateVerificationBadge({
  plate,
  onPlateChange,
  onStatusResolved,
  autoCheck = true,
  compact = false,
  allowManualOverride = true,
}: PlateVerificationBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [isOverriding, setIsOverriding] = useState(false);
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

  const handleToggleStolenStatus = async (markAsStolen: boolean) => {
    if (!result) return;
    setIsOverriding(true);
    try {
      await setPlateStolenStatus(
        result.plate,
        markAsStolen,
        result.vehicleDetails,
        markAsStolen
          ? {
              policeStation: 'Comisaría de Carabineros / Portal AutoSeguro',
              reportNumber: `ALERTA-${result.plate}`,
              commune: 'Región Metropolitana / Coquimbo',
            }
          : undefined
      );
      // Re-check to update UI from live Firestore state
      await performCheck(result.plate);
    } catch (err) {
      console.error('Error overriding stolen status:', err);
    } finally {
      setIsOverriding(false);
    }
  };

  useEffect(() => {
    if (autoCheck && validation.isValid && validation.normalized !== lastCheckedPlate) {
      const timer = setTimeout(() => {
        performCheck(validation.normalized);
      }, 400);
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
          className={`rounded-2xl border-2 p-4 transition-all ${
            result.hasStolenReport
              ? 'bg-red-950/70 border-red-500 text-red-100 shadow-[0_0_35px_rgba(239,68,68,0.45)] animate-in zoom-in-95'
              : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  result.hasStolenReport
                    ? 'bg-red-600 text-white shadow-md shadow-red-950 animate-pulse'
                    : 'bg-emerald-500 text-slate-950 font-bold'
                }`}
              >
                {result.hasStolenReport ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base tracking-wider uppercase text-white">
                    {result.formattedPlate}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full ${
                      result.hasStolenReport
                        ? 'bg-red-500 text-white animate-bounce shadow-md shadow-red-900'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {result.hasStolenReport ? '¡ENCARGO POR ROBO VIGENTE!' : 'SIN ENCARGO'}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold mt-0.5 text-slate-200">
                  {result.statusText}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => performCheck(plate)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900/60 border border-slate-700 transition"
              title="Volver a consultar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vehicle Details */}
          {result.vehicleDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 mt-2 border-t border-white/10 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Marca / Modelo</span>
                <span className="font-black text-white truncate block">{result.vehicleDetails.brand} {result.vehicleDetails.model}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Año</span>
                <span className="font-bold text-white">{result.vehicleDetails.year}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Color</span>
                <span className="font-bold text-white">{result.vehicleDetails.color}</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="block text-[9px] uppercase text-slate-400 font-bold">Tipo</span>
                <span className="font-bold text-white">{result.vehicleDetails.vehicleType}</span>
              </div>
            </div>
          )}

          {/* Stolen Details Banner */}
          {result.stolenDetails && (
            <div className="mt-2.5 p-3 rounded-xl bg-red-900/60 border border-red-500/60 text-xs font-mono space-y-1.5">
              <div className="flex items-center justify-between text-red-100 font-bold">
                <span>Denuncia: {result.stolenDetails.reportNumber}</span>
                <span>{result.stolenDetails.policeAgency}</span>
              </div>
              <p className="text-[11px] text-red-200">
                Unidad: {result.stolenDetails.policeStation} • Comuna: {result.stolenDetails.commune}
              </p>
            </div>
          )}

          {/* Manual Operator Action Toolbar */}
          {allowManualOverride && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-400">
                Fuente: {result.source}
              </span>

              {!result.hasStolenReport ? (
                <button
                  type="button"
                  disabled={isOverriding}
                  onClick={() => handleToggleStolenStatus(true)}
                  className="px-2.5 py-1 rounded-lg bg-red-600/30 hover:bg-red-600 border border-red-500/50 text-red-200 hover:text-white text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 active:scale-95"
                >
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  {isOverriding ? 'Actualizando...' : 'Reportar Robo a la Red'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isOverriding}
                  onClick={() => handleToggleStolenStatus(false)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-200 hover:text-white text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 active:scale-95"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {isOverriding ? 'Actualizando...' : 'Marcar Recuperado'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

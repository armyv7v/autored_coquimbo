import React, { useState, useEffect } from 'react';
import { ShieldWarning, ShieldCheck, MagnifyingGlass, Spinner, Warning, Car, ArrowSquareOut, ArrowsClockwise, SealCheck, Shield, PlusCircle } from '@phosphor-icons/react';
import { checkStolenVehiclePlate, setPlateStolenStatus, isNetworkDeclaredReport, StolenVehicleCheckResult } from '../services/stolenVehicleService';
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
  const [pendingOverride, setPendingOverride] = useState<boolean | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [result, setResult] = useState<StolenVehicleCheckResult | null>(null);
  const [lastCheckedPlate, setLastCheckedPlate] = useState('');
  // A-08: el operador puede adjuntar la referencia oficial si presenta
  // denuncia — los campos son opcionales y el registro conserva el marcador
  // "declaración de operador" en cualquier caso.
  const [denunciaDatos, setDenunciaDatos] = useState({ unidad: '', comuna: '', parte: '' });

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
    setOverrideError(null);
    try {
      // A-08: sin datos fabricados — el servicio escribe la declaración con
      // origen honesto. Si el operador aporta la referencia de su denuncia,
      // esos valores se registran verbatim (el marcador de procedencia no
      // cambia: sigue siendo una declaración sin verificar por la plataforma).
      const hayReferencia = denunciaDatos.unidad.trim() || denunciaDatos.comuna.trim() || denunciaDatos.parte.trim();
      await setPlateStolenStatus(
        result.plate,
        markAsStolen,
        result.vehicleDetails,
        markAsStolen && hayReferencia
          ? {
              policeStation: denunciaDatos.unidad.trim(),
              commune: denunciaDatos.comuna.trim(),
              reportNumber: denunciaDatos.parte.trim(),
            }
          : undefined
      );
      setPendingOverride(null);
      // Re-check to update UI from live Firestore state
      await performCheck(result.plate);
    } catch (err: any) {
      console.error('Error overriding stolen status:', err);
      // A-08: el fallo de escritura no puede quedar solo en consola — el
      // operador debe saber que el registro NO se actualizó. Con las reglas
      // N-R4, la causa más común para un operador es falta de permiso
      // (declarar encargos es de SECURITY/ADMIN), no de conexión.
      setOverrideError(
        err?.code === 'permission-denied'
          ? 'Solo Encargados de Seguridad (SECURITY/ADMIN) pueden declarar o levantar encargos por robo en el registro de la red.'
          : 'No se pudo escribir en el registro de la red. Revisa tu conexión e intenta de nuevo.'
      );
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-sky-700 hover:bg-slate-50 transition active:scale-95"
        >
          <MagnifyingGlass className="w-3.5 h-3.5" />
          Verificar en AutoSeguro / SEBV Carabineros
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 animate-pulse">
          <Spinner className="w-4 h-4 text-sky-600 animate-spin" />
          <span>Consultando base nacional de encargo por robo (AutoSeguro / PDI)...</span>
        </div>
      )}

      {result && !loading && (
        <div
          className={`rounded-2xl border-2 p-4 transition-all ${
            result.hasStolenReport
              ? 'bg-red-50 border-red-500 text-red-900 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-in zoom-in-95'
              : result.status === 'UNKNOWN'
                ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-emerald-50 border-emerald-500/60 text-emerald-900 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    result.hasStolenReport
                      ? 'bg-red-600 text-white shadow-md shadow-red-950 animate-pulse'
                      : result.status === 'UNKNOWN'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-emerald-500 text-slate-950 font-bold'
                  }`}
                >
                  {result.hasStolenReport ? (
                    <ShieldWarning className="w-5 h-5" />
                  ) : result.status === 'UNKNOWN' ? (
                    <Warning className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-base tracking-wider uppercase text-slate-900">
                    {result.formattedPlate}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                      result.hasStolenReport
                        ? 'bg-red-600 text-white animate-bounce shadow-md shadow-red-900'
                        : result.status === 'UNKNOWN'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {result.hasStolenReport
                      ? isNetworkDeclaredReport(result) ? '¡ENCARGO DECLARADO EN RED!' : '¡ENCARGO POR ROBO VIGENTE!'
                      : result.status === 'UNKNOWN' ? 'NO VERIFICADO' : 'SIN ENCARGO'}
                  </span>
                </div>
                <p className="text-xs font-mono font-bold mt-0.5 text-slate-700">
                  {result.statusText}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => performCheck(plate)}
              className="flex items-center justify-center min-h-11 min-w-11 p-2.5 rounded-lg text-slate-500 hover:text-slate-900 bg-white/80 border border-slate-300 hover:bg-white transition"
              title="Volver a consultar"
              aria-label="Volver a consultar"
            >
              <ArrowsClockwise className="w-4 h-4" />
            </button>
          </div>

          {/* Vehicle Details */}
          {result.vehicleDetails && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 mt-2 border-t border-slate-200 text-xs font-mono">
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="block text-[11px] uppercase text-slate-500 font-bold">Marca / Modelo</span>
                <span className="font-black text-slate-900 truncate block">{result.vehicleDetails.brand} {result.vehicleDetails.model}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="block text-[11px] uppercase text-slate-500 font-bold">Año</span>
                <span className="font-bold text-slate-900">{result.vehicleDetails.year}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="block text-[11px] uppercase text-slate-500 font-bold">Color</span>
                <span className="font-bold text-slate-900">{result.vehicleDetails.color}</span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                <span className="block text-[11px] uppercase text-slate-500 font-bold">Tipo</span>
                <span className="font-bold text-slate-900">{result.vehicleDetails.vehicleType}</span>
              </div>
            </div>
          )}

          {/* Stolen Details Banner — A-08: una declaración de operador de la
              red no se presenta como denuncia oficial. */}
          {result.stolenDetails && (
            isNetworkDeclaredReport(result) ? (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span>Declarado en la red: {result.stolenDetails.reportNumber}</span>
                  <span>NO OFICIAL</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Reporte interno de un operador de la red — sin denuncia policial asociada (sin unidad ni comuna informada). Verifícalo con la fuente oficial antes de despachar.
                </p>
              </div>
            ) : (
              <div className="mt-2.5 p-3 rounded-xl bg-red-100/80 border border-red-300 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-red-900 font-bold">
                  <span>Denuncia: {result.stolenDetails.reportNumber}</span>
                  <span>{result.stolenDetails.policeAgency}</span>
                </div>
                <p className="text-[11px] text-red-800">
                  Unidad: {result.stolenDetails.policeStation} • Comuna: {result.stolenDetails.commune}
                </p>
              </div>
            )
          )}

          {/* Manual Operator Action Toolbar — oculta si la consulta no se pudo completar.
              A-08: escribir en el registro compartido de la red exige confirmación
              explícita (un tap accidental envenenaba la base que consulta toda la red). */}
          {allowManualOverride && result.status !== 'UNKNOWN' && (
            <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-600">
                  Fuente: {result.source}
                </span>

                {pendingOverride === null && !result.hasStolenReport && (
                  <button
                    type="button"
                    disabled={isOverriding}
                    onClick={() => setPendingOverride(true)}
                    className="px-3 min-h-11 rounded-lg bg-red-50 hover:bg-red-600 border border-red-300 text-red-700 hover:text-white text-[11px] font-mono font-bold uppercase transition flex items-center gap-1 active:scale-95"
                  >
                    <ShieldWarning className="w-3 h-3" />
                    Reportar Robo a la Red
                  </button>
                )}

                {pendingOverride === null && result.hasStolenReport && (
                  <button
                    type="button"
                    disabled={isOverriding}
                    onClick={() => setPendingOverride(false)}
                    className="px-3 min-h-11 rounded-lg bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 text-emerald-700 hover:text-white text-[11px] font-mono font-bold uppercase transition flex items-center gap-1 active:scale-95"
                  >
                    <SealCheck className="w-3 h-3" />
                    Marcar Recuperado
                  </button>
                )}
              </div>

              {pendingOverride !== null && (
                <div className="p-3 rounded-xl bg-white/90 border border-slate-300 space-y-2.5">
                  <p className="text-[11px] font-mono text-slate-700 leading-relaxed">
                    {pendingOverride
                      ? `¿Reportar ${result.formattedPlate} como ROBO a la red? Queda visible para todas las automotoras.`
                      : `¿Marcar ${result.formattedPlate} como RECUPERADO? Se quitará el encargo de la red.`}
                  </p>
                  {overrideError && (
                    <p className="text-[11px] font-mono text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5" role="alert">
                      {overrideError}
                    </p>
                  )}
                  {pendingOverride && (
                    /* A-08: referencia oficial opcional — si el operador presenta
                       denuncia, sus datos van al registro; si no, quedan 'No indicada'. */
                    <div className="grid grid-cols-1 gap-2">
                      <label className="block">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">Comisaría / unidad (opcional)</span>
                        <input
                          type="text"
                          value={denunciaDatos.unidad}
                          onChange={(e) => setDenunciaDatos((p) => ({ ...p, unidad: e.target.value }))}
                          placeholder="Ej: 2ª Comisaría de Coquimbo"
                          className="w-full text-base px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">Comuna</span>
                          <input
                            type="text"
                            value={denunciaDatos.comuna}
                            onChange={(e) => setDenunciaDatos((p) => ({ ...p, comuna: e.target.value }))}
                            placeholder="Opcional"
                            className="w-full text-base px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">N° de parte</span>
                          <input
                            type="text"
                            value={denunciaDatos.parte}
                            onChange={(e) => setDenunciaDatos((p) => ({ ...p, parte: e.target.value }))}
                            placeholder="Opcional"
                            className="w-full text-base px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isOverriding}
                      onClick={() => handleToggleStolenStatus(pendingOverride)}
                      className={`flex-1 min-h-[40px] px-3 rounded-lg text-white text-[11px] font-mono font-black uppercase tracking-wider transition flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 ${
                        pendingOverride ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {isOverriding ? 'Actualizando…' : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      disabled={isOverriding}
                      onClick={() => { setPendingOverride(null); setOverrideError(null); setDenunciaDatos({ unidad: '', comuna: '', parte: '' }); }}
                      className="flex-1 min-h-[40px] px-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200 text-[11px] font-mono font-bold uppercase tracking-wider transition active:scale-95"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

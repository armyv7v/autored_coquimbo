import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { approveAccessRequest, rejectAccessRequest, AccessRequestData, ApprovalResult } from '../lib/adminAccess';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  KeyRound,
  Copy,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Eye,
} from 'lucide-react';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

interface RequestRecord extends AccessRequestData {
  id: string;
  approvedAt?: any;
  rejectedAt?: any;
  reason?: string;
}

function formatDate(value: any): string {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminAccessRequests() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  const [modal, setModal] = useState<RequestRecord | null>(null);
  const [result, setResult] = useState<ApprovalResult | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'accessRequests'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RequestRecord));
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando solicitudes:', error);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const counts = useMemo(
    () => ({
      PENDING: requests.filter((r) => r.status === 'PENDING').length,
      APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
      REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    }),
    [requests]
  );

  const filtered = requests
    .filter((r) => r.status === filter)
    .sort((a, b) => {
      const ta = a.createdAt?.toDate?.()?.getTime?.() || 0;
      const tb = b.createdAt?.toDate?.()?.getTime?.() || 0;
      return tb - ta;
    });

  const openModal = (r: RequestRecord) => {
    setModal(r);
    setResult(null);
    setShowReason(false);
    setReason('');
    setErr('');
    setCopied(false);
  };

  const closeModal = () => {
    if (busy) return;
    setModal(null);
  };

  const handleApprove = async () => {
    if (!modal) return;
    setBusy(true);
    setErr('');
    try {
      const res = await approveAccessRequest(modal);
      setResult(res);
    } catch (e: any) {
      setErr(e?.message || 'No se pudo aprobar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!modal) return;
    setBusy(true);
    setErr('');
    try {
      await rejectAccessRequest(modal.rutKey, reason.trim());
      setModal(null);
      setBusy(false);
    } catch (e: any) {
      setErr(e?.message || 'No se pudo rechazar la solicitud.');
      setBusy(false);
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { key: 'PENDING', label: 'Pendientes', icon: Clock, tone: 'text-amber-400 bg-amber-400/10' },
    { key: 'APPROVED', label: 'Aprobadas', icon: CheckCircle2, tone: 'text-emerald-400 bg-emerald-400/10' },
    { key: 'REJECTED', label: 'Rechazadas', icon: XCircle, tone: 'text-red-400 bg-red-400/10' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              filter === tab.key
                ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-blue-500/20'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-md text-[11px] ${
                filter === tab.key ? 'bg-white/20' : tab.tone
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-primary" />
          <p className="text-xs font-black uppercase tracking-widest">Cargando solicitudes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 flex flex-col items-center text-center">
          <Inbox className="w-14 h-14 text-slate-800 mb-4" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {filter === 'PENDING'
              ? 'No hay solicitudes pendientes'
              : filter === 'APPROVED'
              ? 'No hay solicitudes aprobadas'
              : 'No hay solicitudes rechazadas'}
          </p>
          {filter === 'PENDING' && (
            <p className="text-xs text-slate-400 mt-1">Las nuevas solicitudes de alta aparecerán aquí.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors hover:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0">
                <div
                  className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${
                    req.status === 'PENDING'
                      ? 'bg-amber-400/10 text-amber-400'
                      : req.status === 'APPROVED'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-red-400/10 text-red-400'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-sm font-black text-white truncate">{req.dealershipName}</h4>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md tracking-tight">
                      RUT {req.rut}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-500" />
                      {req.contactName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {req.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {req.phone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Solicitada {formatDate(req.createdAt)}
                    </span>
                  </div>

                  {req.status === 'REJECTED' && req.reason && (
                    <p className="mt-2 text-xs text-red-400/80 italic flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Motivo: {req.reason}
                    </p>
                  )}
                  {req.status === 'APPROVED' && (
                    <p className="mt-2 text-xs text-emerald-400/80 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Aprobada el {formatDate(req.approvedAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() => openModal(req)}
                      className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      Aprobar y generar credenciales
                    </button>
                    <button
                      onClick={() => openModal(req)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
                    >
                      Rechazar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openModal(req)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detalle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={closeModal}
          >
            <div className="min-h-full flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-7 max-h-[90vh] overflow-y-auto"
            >
              {result ? (
                <div className="text-center">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Acceso Aprobado</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-5">
                    Se crearon las credenciales para <strong className="text-white">{result.email}</strong> con perfil{' '}
                    <strong className="text-brand-primary">PROPIETARIO</strong> y la sede quedó activa en la red.
                  </p>

                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 mb-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300 mb-2 flex items-center gap-1.5 justify-center">
                      <KeyRound className="w-3.5 h-3.5" />
                      Contraseña temporal
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="font-mono text-lg font-bold text-white tracking-widest bg-slate-950/60 px-3 py-2 rounded-lg border border-white">
                        {result.tempPassword}
                      </code>
                      <button
                        onClick={copyPassword}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-all"
                        title="Copiar contraseña"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300/80 leading-relaxed mb-6 flex gap-2 text-left">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Entrega esta contraseña por un canal seguro. No volverá a mostrarse.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={copyPassword}
                      className="rounded-xl bg-slate-800 text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                      {copied ? '¡Copiada!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => setModal(null)}
                      className="rounded-xl bg-brand-primary text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">Detalle de solicitud</h3>
                      <p className="text-xs text-slate-400 font-mono tracking-tight mt-0.5">RUT {modal.rutKey}</p>
                    </div>
                    <span
                      className={`text-[11px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${
                        modal.status === 'PENDING'
                          ? 'bg-amber-400/10 text-amber-400'
                          : modal.status === 'APPROVED'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-red-400/10 text-red-400'
                      }`}
                    >
                      {modal.status}
                    </span>
                  </div>

                  <dl className="space-y-3 mb-6">
                    {[
                      ['Automotora', modal.dealershipName],
                      ['RUT', modal.rut],
                      ['Titular', modal.contactName],
                      ['Correo', modal.email],
                      ['Teléfono', modal.phone],
                      ['Dirección', modal.address || '—'],
                      ['Rol solicitado', 'PROPIETARIO'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-start justify-between gap-4 pb-1 border-b border-slate-800/60"
                      >
                        <dt className="text-[11px] font-black uppercase tracking-widest text-slate-400 pt-0.5">
                          {label}
                        </dt>
                        <dd className="text-xs text-slate-200 text-right font-semibold break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {err && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200 mb-4">
                      {err}
                    </div>
                  )}

                  {modal.status === 'PENDING' ? (
                    <>
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-300/80 mb-5 flex gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Al aprobar se generará una cuenta de acceso con contraseña temporal y la sede quedará activa
                          en la red.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          disabled={busy}
                          onClick={handleApprove}
                          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 py-3 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/25 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Aprobar
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setShowReason(true)}
                          className="flex items-center justify-center gap-2 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 py-3 text-xs font-black uppercase tracking-widest hover:bg-red-500/25 transition-all disabled:opacity-50 active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>

                      {showReason && (
                        <div className="mb-3">
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Motivo del rechazo (opcional)..."
                            rows={2}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                          />
                          <button
                            disabled={busy}
                            onClick={handleReject}
                            className="w-full rounded-xl bg-red-500 text-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 active:scale-95"
                          >
                            Confirmar rechazo
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => setModal(null)}
                      className="w-full rounded-xl bg-slate-800 text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                      Cerrar
                    </button>
                  )}
                </>
              )}
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
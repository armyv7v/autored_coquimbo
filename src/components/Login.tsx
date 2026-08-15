import React, { useMemo, useState } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Info,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  User,
  Zap,
  Activity,
  Sparkles,
  Radio,
  Volume2,
  VolumeX,
  ShieldCheck,
  ChevronRight,
  Siren,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InteractiveNetworkWeb, { NODES, WebNode } from './InteractiveNetworkWeb';
import Footer from './Footer';
import { sound } from '../lib/soundEngine';

type LoginMode = 'intro' | 'login' | 'request' | 'sent';

const normalizeRut = (value: string) =>
  value
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .toUpperCase();

const capabilityCards = [
  {
    num: '01',
    title: 'Disuasión Colectiva',
    desc: 'Un reporte en su patio activa alertas perimetrales inmediatas en todas las automotoras de la red.',
    color: 'from-orange-500/20 to-transparent border-brand-primary/40',
  },
  {
    num: '02',
    title: 'Telemetría y Pánico 10s',
    desc: 'Botón de pánico con GPS automático, transmisión instantánea y pulso de sonar en mapa satelital.',
    color: 'from-red-500/20 to-transparent border-red-500/40',
  },
  {
    num: '03',
    title: 'Prueba en Ruta Segura',
    desc: 'Registro fotográfico guiado antes de cada Test Drive para blindar contra fraudes o sustitución.',
    color: 'from-amber-500/20 to-transparent border-amber-500/40',
  },
  {
    num: '04',
    title: 'Validación por RUT',
    desc: 'Acceso corporativo validado por representante legal para mantener la red 100% blindada.',
    color: 'from-sky-500/20 to-transparent border-sky-500/40',
  },
];

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('intro');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dealershipName, setDealershipName] = useState('');
  const [rut, setRut] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertPulseCount, setAlertPulseCount] = useState(0);
  
  // Interactive Living Organism States
  const [stormMode, setStormMode] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());
  const [selectedNode, setSelectedNode] = useState<WebNode | null>(null);

  const rutKey = useMemo(() => normalizeRut(rut), [rut]);
  const requestReady = Boolean(dealershipName.trim() && rutKey.length >= 8 && contactName.trim() && phone.trim() && address.trim() && email.trim());

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const handleTriggerNetworkAlert = () => {
    setAlertPulseCount((prev) => prev + 1);
    sound.playNodePulse(true);
  };

  const handleToggleStormAlert = () => {
    if (stormMode) {
      setStormMode(false);
      sound.stopPoliceSiren();
    } else {
      setStormMode(true);
      setAlertPulseCount((prev) => prev + 1);
      sound.playPoliceSiren(4.0);
      
      setTimeout(() => {
        setStormMode(false);
      }, 4500);
    }
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleSelectNode = (node: WebNode) => {
    setSelectedNode(node);
    setAlertPulseCount((prev) => prev + 1);
  };

  const handleDemoLogin = async (demoEmail: string, role: 'ADMIN' | 'SECURITY' = 'ADMIN') => {
    setLoading(true);
    resetFeedback();
    sound.playNodePulse(true);
    const demoPass = 'autored2026';
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        } else {
          throw err;
        }
      }
      const user = userCredential.user;
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: role === 'ADMIN' ? 'Administrador AutoRed' : 'Operador Seguridad',
          role: role,
          dealershipId: 'DEALERSHIP_DEMO',
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError('Error en acceso de prueba: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Ingrese su correo electrónico para restablecer la contraseña.');
      return;
    }
    setLoading(true);
    resetFeedback();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Se ha enviado un correo con instrucciones para restablecer su contraseña.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setError(
        err.code === 'auth/user-not-found'
          ? 'No existe una cuenta registrada con este correo.'
          : 'No se pudo enviar el correo de recuperación. Intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    sound.playNodePulse(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciales inválidas. Verifique su correo electrónico y contraseña.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Por favor intente más tarde.');
      } else {
        setError('Error al iniciar sesión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    if (rutKey.length < 8) {
      setLoading(false);
      setError('Ingrese un RUT válido de la automotora.');
      return;
    }

    try {
      await setDoc(doc(db, 'accessRequests', rutKey), {
        dealershipName: dealershipName.trim(),
        rut: rut.trim(),
        rutKey,
        contactName: contactName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim().toLowerCase(),
        requestedRole: 'OWNER',
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });

      setMode('sent');
      handleTriggerNetworkAlert();
    } catch (err: any) {
      console.error('Access request error:', err);
      setError(
        err.code === 'permission-denied'
          ? 'Ya existe una solicitud para este RUT o faltan datos obligatorios.'
          : 'No se pudo enviar la solicitud. Intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-noise min-h-dvh bg-[#02050c] text-white relative overflow-hidden flex flex-col justify-between selection:bg-brand-primary selection:text-white">
      {/* Fullscreen Immersive Organism Spider Web Background */}
      <div className="fixed inset-0 z-0 opacity-90 pointer-events-auto">
        <InteractiveNetworkWeb
          className="w-full h-full"
          pulseTriggerCount={alertPulseCount}
          stormActive={stormMode}
          selectedNodeId={selectedNode?.id || null}
          interactive={true}
          onNodeSelect={(node) => setSelectedNode(node)}
        />
        {/* Spatial Vignette & Cyber Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,5,12,0.85)_100%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Floating Tactical Action Deck (Always Clickable) */}
      <header className="relative z-30 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto w-full pointer-events-auto">
        <BrandHeader />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleToggleStormAlert}
            className={`px-3 sm:px-4 py-2 rounded-full text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-xl border transition-all active:scale-95 shadow-xl ${
              stormMode
                ? 'bg-red-600 text-white border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse'
                : 'bg-slate-900/90 text-red-300 border-red-500/40 hover:bg-red-500/20 hover:border-red-400 hover:text-white'
            }`}
            title="Simular Alerta Máxima con Sirena Policial y Sobrecarga"
          >
            <Siren className={`w-4 h-4 text-red-400 ${stormMode ? 'animate-spin' : ''}`} />
            <span className="font-black uppercase tracking-wider">
              {stormMode ? 'SIRENA ACTIVA' : 'SIMULAR ALERTA MÁXIMA'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-2.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-brand-primary/60 hover:text-brand-primary backdrop-blur-xl transition active:scale-95 shadow-lg"
            title={isMuted ? 'Activar Audio Táctico' : 'Silenciar Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-brand-primary animate-pulse" />}
          </button>
        </div>
      </header>

      {/* Main Experience Layout */}
      <section className="relative z-10 flex-1 grid xl:grid-cols-[1.18fr_0.82fr] pointer-events-none">
        {/* Left Column: Spatial Narrative & Interactive Node Deck */}
        <aside className="hidden xl:flex flex-col justify-between p-10 2xl:p-14 border-r border-white/10 pointer-events-auto">
          {/* Spatial Headline */}
          <div className="max-w-4xl my-auto py-4">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-brand-primary/50 bg-gradient-to-r from-brand-primary/20 via-brand-primary/10 to-transparent text-brand-primary text-xs font-mono font-bold uppercase tracking-[0.25em] mb-5 backdrop-blur-xl shadow-[0_0_25px_rgba(255,107,0,0.25)]">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
              Organismo Digital en Red • Coquimbo
            </div>

            <h1 className="font-display max-w-4xl text-4xl 2xl:text-6xl font-black tracking-[-.06em] leading-[0.94] text-balance">
              La red privada que <span className="bg-gradient-to-r from-brand-primary via-orange-400 to-amber-300 bg-clip-text text-transparent">detecta y transmite</span> antes del impacto.
            </h1>

            <p className="mt-5 max-w-2xl text-sm 2xl:text-base leading-7 text-slate-300 font-normal">
              Cada nodo representa una automotora, punto de control o vigilante en patio. Al detectarse un hecho sospechoso, la red propaga pulsos de datos e imágenes en tiempo real directamente al centro de custodia.
            </p>

            {/* Interactive Capability Capsules */}
            <div className="grid grid-cols-2 gap-3 mt-6 max-w-2xl">
              {capabilityCards.map((card) => (
                <div
                  key={card.num}
                  className={`p-3 rounded-2xl border bg-slate-950/70 backdrop-blur-xl transition hover:border-brand-primary/60 hover:bg-slate-900/80 group ${card.color}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-brand-primary">{card.num}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">ACTIVO</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-0.5 group-hover:text-brand-primary transition">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Node Deck (Punto 4: Telemetría e Interacción en Vivo) */}
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-4 items-end">
            <div className="rounded-2xl border border-white/10 p-4 backdrop-blur-2xl bg-slate-950/85 shadow-2xl">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Nodos en Red (Seleccione para inspeccionar)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  EN LÍNEA
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {NODES.filter((n) => !n.isCore).slice(0, 8).map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-left transition active:scale-95 ${
                        isSelected
                          ? 'bg-brand-primary/20 border-brand-primary text-white shadow-[0_0_15px_rgba(255,107,0,0.4)]'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="truncate text-[11px] font-semibold">{node.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">{node.latency}ms</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-brand-primary/40 p-4 backdrop-blur-2xl bg-gradient-to-br from-orange-950/40 via-slate-950/90 to-slate-950 shadow-[0_0_30px_rgba(255,107,0,0.2)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Transmisión Táctica
                </span>
                <span className="text-[10px] font-mono text-slate-400">Enlace Óptico</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {selectedNode
                  ? `Nodo ${selectedNode.name} seleccionado. Transmite ráfagas de telemetría directamente al núcleo de seguridad.`
                  : 'Desplace el cursor sobre los filamentos o transmita una ráfaga general de telemetría a la red.'}
              </p>
              <button
                type="button"
                onClick={handleTriggerNetworkAlert}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-primary to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/30 active:scale-95 transition"
              >
                <Zap className="w-4 h-4 text-white" />
                {selectedNode ? `Transmitir a ${selectedNode.name}` : 'Transmitir Ráfaga a la Red'}
              </button>
            </div>
          </div>
        </aside>

        {/* Right Column: Portal Cards / Authentication & Registration */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[480px] rounded-[2.2rem] border-2 border-white/15 bg-slate-950/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.85)]"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="mb-3.5 inline-flex rounded-2xl bg-gradient-to-br from-brand-primary to-orange-600 p-3 shadow-lg shadow-brand-primary/30">
                  <ShieldAlert className="h-6 w-6 text-white" />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-[-.04em] text-white">
                  {mode === 'intro' && 'Acceso a la Red AutoRed'}
                  {mode === 'request' && 'Solicitar Incorporación'}
                  {mode === 'sent' && 'Solicitud Recibida'}
                  {mode === 'login' && 'Ingreso Autorizado'}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-400">
                  {mode === 'intro' && 'Plataforma privada de seguridad, telemetría y coordinación para automotoras de la Región de Coquimbo.'}
                  {mode === 'request' && 'Ingrese los datos de su automotora y representante legal para validar su incorporación.'}
                  {mode === 'sent' && 'Su solicitud está en proceso de validación. Nos comunicaremos vía correo y WhatsApp.'}
                  {mode === 'login' && 'Ingrese con las credenciales asignadas por el Centro de Comando.'}
                </p>
              </div>

              {mode !== 'intro' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('intro');
                    resetFeedback();
                    sound.playNodePulse(false);
                  }}
                  className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition shrink-0"
                  aria-label="Volver al menú"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {mode === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        sound.playNodePulse(false);
                      }}
                      className="group rounded-2xl bg-gradient-to-r from-brand-primary to-orange-600 p-4 text-left font-black text-white shadow-xl shadow-brand-primary/25 hover:from-orange-500 hover:to-orange-600 active:scale-[.98] transition border border-orange-400/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Lock className="w-5 h-5 text-white/90" />
                        <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-sm font-black">Iniciar Sesión</p>
                      <p className="text-[11px] text-white/80 font-normal mt-0.5">Credenciales activas</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('request');
                        sound.playNodePulse(false);
                      }}
                      className="group rounded-2xl border-2 border-white/12 bg-white/[.045] p-4 text-left font-black text-white hover:border-brand-primary/50 hover:bg-white/[.08] active:scale-[.98] transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Building2 className="w-5 h-5 text-brand-primary" />
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <p className="text-sm font-black">Solicitar Ingreso</p>
                      <p className="text-[11px] text-slate-400 font-normal mt-0.5">Nueva automotora</p>
                    </button>
                  </div>

                  {/* Acceso Rápido de Prueba 1-Tap */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-brand-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Acceso de Demostración
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">1-Tap Login</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoLogin('admin@autored.cl', 'ADMIN')}
                        className="py-2.5 px-3 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary font-mono text-xs font-bold uppercase transition active:scale-95 text-center"
                      >
                        Acceso Administrador
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoLogin('seguridad@autored.cl', 'SECURITY')}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-mono text-xs font-bold uppercase transition active:scale-95 text-center"
                      >
                        Acceso Operador
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-sky-400/20 bg-sky-400/8 flex items-center gap-2.5 text-xs text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Red encriptada y monitoreada las 24 horas en la conurbación La Serena - Coquimbo.</span>
                  </div>
                </motion.div>
              )}

              {mode === 'sent' && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-5"
                >
                  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Solicitud Enviada con Éxito</h3>
                    <p className="text-xs leading-relaxed text-emerald-100 font-medium">
                      Su <strong className="text-white">"Solicitud de ingreso"</strong> a la Red de Automotoras fue enviada. El equipo administrador validará el RUT comercial y habilitará sus credenciales de acceso.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('intro')}
                    className="w-full rounded-2xl bg-white text-slate-950 font-black py-3.5 hover:bg-slate-200 active:scale-[.98] transition uppercase tracking-widest text-xs"
                  >
                    Cerrar y Volver
                  </button>
                </motion.div>
              )}

              {(mode === 'login' || mode === 'request') && (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'request' ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  onSubmit={mode === 'request' ? handleAccessRequest : handleLogin}
                  className="space-y-4"
                >
                  {mode === 'request' && (
                    <>
                      <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-3.5 text-xs leading-relaxed text-red-100 shadow-lg">
                        <strong className="block text-xs font-black uppercase tracking-[.28em] text-red-300 mb-1">IMPORTANTE</strong>
                        Ingresar datos reales de la Automotora y Representante Legal para blindar la red contra intrusiones.
                      </div>

                      <Field icon={<Building2 />} label="Nombre Automotora">
                        <input value={dealershipName} onChange={(e) => setDealershipName(e.target.value)} required className="auth-input" placeholder="Nombre Fantasía / Razón Social" />
                      </Field>
                      <Field icon={<Building2 />} label="RUT Automotora">
                        <input value={rut} onChange={(e) => setRut(e.target.value)} required className="auth-input" placeholder="76.123.456-7" />
                      </Field>
                      <Field icon={<User />} label="Representante Legal / Dueño">
                        <input value={contactName} onChange={(e) => setContactName(e.target.value)} required className="auth-input" placeholder="Nombre completo representante" />
                      </Field>
                      <Field icon={<Phone />} label="Teléfono de Contacto">
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="auth-input" placeholder="+56 9 1234 5678" />
                      </Field>
                      <Field icon={<Building2 />} label="Dirección Sede Principal">
                        <input value={address} onChange={(e) => setAddress(e.target.value)} required className="auth-input" placeholder="Av. Balmaceda 1234, Coquimbo" />
                      </Field>
                    </>
                  )}

                  <Field icon={<Mail />} label={mode === 'request' ? 'Correo de Contacto' : 'Correo Corporativo'}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" placeholder="contacto@automotora.cl" />
                  </Field>

                  {mode === 'login' && (
                    <>
                      <Field icon={<Lock />} label="Contraseña">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="auth-input" placeholder="••••••••" />
                      </Field>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono flex items-center justify-between gap-2">
                        <span className="text-slate-400 truncate">Prueba: <strong className="text-white">admin@autored.cl</strong> / <strong className="text-white">autored2026</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('admin@autored.cl');
                            setPassword('autored2026');
                            sound.playNodePulse(false);
                          }}
                          className="text-brand-primary hover:underline font-bold shrink-0"
                        >
                          Auto-llenar
                        </button>
                      </div>
                    </>
                  )}

                  {error && <Feedback tone="error">{error}</Feedback>}
                  {message && <Feedback tone="success">{message}</Feedback>}

                  <button
                    type="submit"
                    disabled={loading || (mode === 'request' && !requestReady)}
                    className="w-full rounded-2xl bg-gradient-to-r from-brand-primary to-orange-600 py-3.5 font-black text-white shadow-xl shadow-brand-primary/20 hover:from-orange-500 hover:to-orange-600 active:scale-[.98] disabled:opacity-60 transition"
                  >
                    {loading ? 'Procesando...' : mode === 'request' ? 'Enviar Solicitud de Ingreso' : 'Iniciar Sesión'}
                  </button>

                  {mode === 'login' ? (
                    <div className="flex items-center justify-between gap-4 pt-2 text-xs">
                      <button type="button" onClick={handleResetPassword} className="text-slate-400 hover:text-white transition">
                        Olvidé mi contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('request');
                          resetFeedback();
                          sound.playNodePulse(false);
                        }}
                        className="font-bold text-brand-primary hover:text-orange-300 transition"
                      >
                        Solicitar ingreso
                      </button>
                    </div>
                  ) : (
                    <p className="pt-2 text-xs leading-5 text-slate-400">
                      Si ya cuenta con credenciales activas, regrese al panel de acceso e inicie sesión normalmente.
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Floating Node Telemetry Hologram (Interactive Point 4) */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md bg-slate-950/95 border-2 border-brand-primary/80 text-white p-4 rounded-3xl shadow-[0_0_50px_rgba(255,107,0,0.4)] backdrop-blur-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-brand-primary/30 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-black uppercase text-brand-primary tracking-wider">
                  TELEMETRÍA EN VIVO • {selectedNode.sector}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="font-display font-black text-base text-white">
                {selectedNode.name}
              </h4>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {selectedNode.latency}ms Ping
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Punto de enlace activo con {selectedNode.dealersCount} automotoras sincronizadas. Al pulsar, transmite un paquete de datos óptico hacia el Escudo Central.
            </p>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 mb-3">
              <div>
                <span className="block text-[9px] uppercase text-slate-500">Estado</span>
                <span className="font-bold text-emerald-400">EN LÍNEA</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-slate-500">Sedes</span>
                <span className="font-bold text-white">{selectedNode.dealersCount} Patios</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase text-slate-500">Encriptación</span>
                <span className="font-bold text-sky-400">AES-256</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAlertPulseCount((prev) => prev + 1);
                sound.playNodePulse(true);
              }}
              className="w-full py-2.5 rounded-xl bg-brand-primary hover:bg-orange-600 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/30 active:scale-95 transition"
            >
              <Zap className="w-4 h-4" />
              Transmitir Pulso Óptico al Centro
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className={`${compact ? 'h-10 w-12' : 'h-11 w-14 sm:h-12 sm:w-16'} brand-node-badge relative rounded-2xl border border-brand-primary/40 bg-slate-950/80 shadow-lg shadow-brand-primary/20 shrink-0`}>
        <span className="absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-primary shadow-[0_0_18px_rgba(255,107,0,.8)]" />
        <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white/90" />
        <span className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-brand-primary to-white/70" />
        <span className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-primary/80" />
        <span className="absolute left-1/2 bottom-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/60" />
      </div>
      <div>
        <p className={`${compact ? 'text-base' : 'text-lg sm:text-xl'} font-black tracking-[-.04em] text-white leading-tight`}>
          AutoRed <span className="text-brand-primary">Coquimbo</span>
        </p>
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[.28em] text-slate-400 font-mono font-bold">
          Red Privada Automotora
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-mono font-bold uppercase tracking-[.18em] text-slate-400">{label}</span>
      <span className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
        {children}
      </span>
    </label>
  );
}

function Feedback({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const classes =
    tone === 'error'
      ? 'border-red-400/30 bg-red-400/10 text-red-100'
      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';

  return (
    <div className={`flex gap-2 rounded-2xl border p-3 text-xs leading-5 ${classes}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

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
  Wifi,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InteractiveNetworkWeb, { WebNode } from './InteractiveNetworkWeb';
import Footer from './Footer';
import { sound } from '../lib/soundEngine';

type LoginMode = 'intro' | 'login' | 'request' | 'sent';

const normalizeRut = (value: string) =>
  value
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .toUpperCase();

const networkNodes = [
  { id: 'n1', name: 'Ruta 5 Norte', ping: '8ms', status: 'ONLINE', role: 'Control Perimetral' },
  { id: 'n2', name: 'Muelle Fiscal', ping: '12ms', status: 'ONLINE', role: 'Enlace Puerto' },
  { id: 'n3', name: 'Zona Puerto / Altamira', ping: '11ms', status: 'ONLINE', role: 'Vigilancia Red' },
  { id: 'n4', name: 'Peaje Ruta 43', ping: '15ms', status: 'ONLINE', role: 'Filtro Acceso' },
  { id: 'n5', name: 'Centro Coquimbo', ping: '7ms', status: 'ONLINE', role: 'Patrullaje Urbano' },
  { id: 'n6', name: 'Patio Automotriz Norte', ping: '9ms', status: 'ONLINE', role: 'Custodia Parque' },
  { id: 'n7', name: 'Patio Automotriz Sur', ping: '10ms', status: 'ONLINE', role: 'Custodia Stock' },
  { id: 'n8', name: 'Acceso Panul', ping: '14ms', status: 'ONLINE', role: 'Control Sur' },
];

const capabilityCards = [
  {
    num: '01',
    title: 'Disuasión Colectiva',
    desc: 'Un reporte en tu patio activa alertas perimetrales inmediatas en todas las automotoras de la red.',
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
    desc: 'Registro fotográfico guiado antes de cada Test Drive para blindar contra sustituciones o fraudes.',
    color: 'from-amber-500/20 to-transparent border-amber-500/40',
  },
  {
    num: '04',
    title: 'Validación por RUT',
    desc: 'Acceso corporativo exclusivo y verificado por representante legal para mantener la red blindada.',
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
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<WebNode | null>(null);

  const rutKey = useMemo(() => normalizeRut(rut), [rut]);
  const requestReady = Boolean(dealershipName.trim() && rutKey.length >= 8 && contactName.trim() && phone.trim() && address.trim() && email.trim());

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const handleTriggerNetworkAlert = () => {
    setAlertPulseCount((prev) => prev + 1);
    sound.playTacticalAlarm();
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
      setError('Error en acceso demo: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Ingresa tu correo para recuperar contraseña.');
      return;
    }
    setLoading(true);
    resetFeedback();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Te enviamos un correo con instrucciones para restablecer tu clave.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setError(
        err.code === 'auth/user-not-found'
          ? 'No existe una cuenta registrada con este correo.'
          : 'No pudimos enviar el correo de recuperación. Intenta nuevamente.'
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
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setError('Error al iniciar sesión. Intenta nuevamente.');
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
      setError('Ingresa un RUT válido de la automotora.');
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
          : 'No pudimos enviar la solicitud. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-noise min-h-dvh bg-[#02050c] text-white relative overflow-hidden flex flex-col justify-between selection:bg-brand-primary selection:text-white">
      {/* Fullscreen Immersive Organism Spider Web Background */}
      <div className="fixed inset-0 z-0 opacity-90">
        <InteractiveNetworkWeb
          className="w-full h-full"
          pulseTriggerCount={alertPulseCount}
          interactive={true}
          onNodeSelect={(node) => setSelectedNodeInfo(node)}
        />
        {/* Spatial Vignette & Cyber Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,5,12,0.85)_100%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Main Experience Layout */}
      <section className="relative z-10 min-h-dvh grid xl:grid-cols-[1.18fr_0.82fr]">
        {/* Left Column: Spatial Narrative & Real-time Digital Organism Deck */}
        <aside className="hidden xl:flex flex-col justify-between p-12 2xl:p-16 border-r border-white/10 backdrop-blur-[3px]">
          <BrandHeader />

          {/* Spatial Headline & Live Cyber Narrative */}
          <div className="max-w-4xl my-auto py-8">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-brand-primary/50 bg-gradient-to-r from-brand-primary/20 via-brand-primary/10 to-transparent text-brand-primary text-xs font-mono font-bold uppercase tracking-[0.25em] mb-6 backdrop-blur-xl shadow-[0_0_25px_rgba(255,107,0,0.25)]">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
              Organismo Digital en Red • Coquimbo
            </div>

            <h1 className="font-display max-w-4xl text-5xl 2xl:text-7xl font-black tracking-[-.06em] leading-[0.92] text-balance">
              La telaraña privada que <span className="bg-gradient-to-r from-brand-primary via-orange-400 to-amber-300 bg-clip-text text-transparent">siente y transmite</span> antes del impacto.
            </h1>

            <p className="mt-7 max-w-2xl text-base 2xl:text-lg leading-8 text-slate-300 font-normal">
              Cada nodo representa una automotora, punto de control o vigilante en patio. Al detectarse un movimiento sospechoso o intento de robo, la red propaga pulsos de energía e imágenes en tiempo real directamente al centro de custodia.
            </p>

            {/* Interactive Capability Capsules */}
            <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-2xl">
              {capabilityCards.map((card) => (
                <div
                  key={card.num}
                  className={`p-3.5 rounded-2xl border bg-slate-950/70 backdrop-blur-xl transition hover:border-brand-primary/60 hover:bg-slate-900/80 group ${card.color}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-black text-brand-primary">{card.num}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ACTIVO</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 group-hover:text-brand-primary transition">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Telemetry & Simulation Deck */}
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-4 items-end">
            <div className="rounded-2xl border border-white/10 p-4 backdrop-blur-2xl bg-slate-950/80 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Nodos Interconectados ({networkNodes.length})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  LATENCIA &lt; 15ms
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {networkNodes.slice(0, 6).map((node) => (
                  <div key={node.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300">
                    <span className="truncate text-[11px] font-medium">{node.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">{node.ping}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-brand-primary/40 p-4 backdrop-blur-2xl bg-gradient-to-br from-orange-950/40 via-slate-950/90 to-slate-950 shadow-[0_0_30px_rgba(255,107,0,0.2)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Simulación de Pulsos
                </span>
                <span className="text-[10px] font-mono text-slate-400">Web Física</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
                Interactuá con la telaraña estirando sus fibras o transmití una onda expansiva de emergencia a toda la red.
              </p>
              <button
                type="button"
                onClick={handleTriggerNetworkAlert}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-primary to-orange-600 hover:from-orange-500 hover:to-orange-600 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/30 active:scale-95 transition"
              >
                <Zap className="w-4 h-4 text-white" />
                Disparar Alerta en Red
              </button>
            </div>
          </div>
        </aside>

        {/* Right Column: Interactive Portal / Authentication & Registration */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12 z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[500px] rounded-[2.2rem] border-2 border-white/15 bg-slate-950/85 backdrop-blur-2xl p-6 sm:p-9 shadow-[0_0_60px_rgba(0,0,0,0.85)]"
          >
            {/* Mobile Header with Quick Pulse Simulation */}
            <div className="xl:hidden mb-6 flex items-center justify-between">
              <BrandHeader compact />
              <button
                type="button"
                onClick={handleTriggerNetworkAlert}
                className="flex items-center gap-1.5 rounded-full border border-brand-primary/50 bg-brand-primary/15 px-3 py-1.5 text-xs font-mono font-bold text-brand-primary active:scale-95 transition"
              >
                <Zap className="w-3.5 h-3.5" />
                Alerta
              </button>
            </div>

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
                  {mode === 'request' && 'Ingresa los datos de tu automotora y representante legal para validar tu concesión.'}
                  {mode === 'sent' && 'Tu solicitud está en proceso de validación. Te contactaremos vía correo y WhatsApp.'}
                  {mode === 'login' && 'Ingresa con las credenciales asignadas por el Centro de Comando.'}
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
                        Acceso Rápido de Prueba
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">1-Tap Login</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDemoLogin('admin@autored.cl', 'ADMIN')}
                        className="py-2.5 px-3 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-brand-primary font-mono text-xs font-bold uppercase transition active:scale-95 text-center"
                      >
                        Entrar como Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoLogin('seguridad@autored.cl', 'SECURITY')}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-mono text-xs font-bold uppercase transition active:scale-95 text-center"
                      >
                        Entrar Operador
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-sky-400/20 bg-sky-400/8 flex items-center gap-2.5 text-xs text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Red encriptada y monitoreada 24/7 en toda la conurbación La Serena - Coquimbo.</span>
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
                      Su <strong className="text-white">"Solicitud de ingreso"</strong> a la RED de Automotoras fue enviada. El administrador validará el RUT comercial y habilitará las credenciales.
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
                        Ingresar datos reales de Automotora y Representante Legal para blindar la red contra intrusiones.
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
                      <Field icon={<Phone />} label="Teléfono WhatsApp">
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
                      Si ya tienes credenciales activas, vuelve al acceso e inicia sesión normalmente.
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`${compact ? 'h-11 w-14' : 'h-12 w-16'} brand-node-badge relative rounded-2xl border border-brand-primary/40 bg-slate-950/80 shadow-lg shadow-brand-primary/20`}>
        <span className="absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-primary shadow-[0_0_18px_rgba(255,107,0,.8)]" />
        <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white/90" />
        <span className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-brand-primary to-white/70" />
        <span className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-primary/80" />
        <span className="absolute left-1/2 bottom-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/60" />
      </div>
      <div>
        <p className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-[-.04em] text-white`}>AutoRed <span className="text-brand-primary">Coquimbo</span></p>
        <p className="text-[11px] uppercase tracking-[.32em] text-slate-400 font-mono font-bold">Red Privada Automotora</p>
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

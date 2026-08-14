import React, { useMemo, useState } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ArrowLeft, Building2, CheckCircle2, Info, Lock, Mail, Phone, ShieldAlert, User, Zap, Activity, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import InteractiveNetworkWeb from './InteractiveNetworkWeb';
import Footer from './Footer';

type LoginMode = 'intro' | 'login' | 'request' | 'sent';

const normalizeRut = (value: string) =>
  value
    .replace(/\./g, '')
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .toUpperCase();

const networkPoints = [
  'Ruta 5 Norte',
  'Muelle Fiscal',
  'Zona Puerto / Altamira',
  'Peaje Ruta 43',
  'Centro Coquimbo',
  'Acceso Sur / Panul',
];

const capabilityCards = [
  ['01', 'Reportes con foto, video o nota de voz para hechos sospechosos.'],
  ['02', 'Alerta máxima a automotoras cercanas, incluso fuera de horario.'],
  ['03', 'Mapa operativo con historial de robos, eventos y zonas sensibles.'],
  ['04', 'Solicitud de ingreso validada por RUT comercial y representante.'],
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

  const rutKey = useMemo(() => normalizeRut(rut), [rut]);
  const requestReady = Boolean(dealershipName.trim() && rutKey.length >= 8 && contactName.trim() && phone.trim() && address.trim() && email.trim());

  const resetFeedback = () => {
    setError('');
    setMessage('');
  };

  const handleTriggerNetworkAlert = () => {
    setAlertPulseCount((prev) => prev + 1);
  };

  const handleDemoLogin = async (demoEmail: string, role: 'ADMIN' | 'SECURITY' = 'ADMIN') => {
    setLoading(true);
    resetFeedback();
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
      setError('Ingresa tu correo corporativo para recuperar la contraseña.');
      return;
    }

    setLoading(true);
    resetFeedback();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Te enviamos las instrucciones de recuperación al correo indicado.');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('No pudimos enviar el correo. Verifica el correo o contacta al administrador.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Usuario AutoRed',
          role: (user.email === 'admin@autored.cl' || user.email === 'gerencia@automotorauseche.com') ? 'ADMIN' : 'SECURITY',
          dealershipId: 'TEMP_ID',
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err.code || '';

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Credenciales inválidas. Revisa correo y contraseña.');
      } else if (code === 'auth/user-not-found') {
        setError('No existe una cuenta activa con este correo.');
      } else {
        setError('No pudimos iniciar sesión. Intenta nuevamente.');
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
      // Trigger a visual surge on submission
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
    <main className="auth-noise min-h-dvh bg-[#03060d] text-white relative overflow-hidden flex flex-col justify-between">
      {/* Fullscreen Immersive Canvas Telaraña Web Background */}
      <div className="fixed inset-0 z-0 opacity-85">
        <InteractiveNetworkWeb
          className="w-full h-full"
          pulseTriggerCount={alertPulseCount}
          interactive={true}
        />
        {/* Subtle vignette and radial gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,6,13,0.85)_100%)]" />
      </div>

      {/* Main Container */}
      <section className="relative z-10 min-h-dvh grid xl:grid-cols-[1.15fr_0.85fr]">
        {/* Left Side: Brand Story & Live Network Node Controls */}
        <aside className="hidden xl:flex flex-col justify-between p-12 2xl:p-16 border-r border-white/10 backdrop-blur-[2px]">
          <BrandHeader />

          <div className="max-w-4xl my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-primary/40 bg-brand-primary/10 text-brand-primary text-xs font-black uppercase tracking-[0.3em] mb-6 backdrop-blur-md">
              <Activity className="w-4 h-4 animate-pulse" />
              Red viva de información
            </div>
            <h1 className="font-display max-w-4xl text-5xl 2xl:text-7xl font-black tracking-[-.06em] leading-[0.9] text-balance">
              La telaraña privada que detecta y transmite antes del impacto.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Cada nodo representa una automotora, punto de control o vehículo patrulla. Cuando ocurre una eventualidad, la información fluye al instante como pulsos de energía directamente al centro de comando.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-5 items-end">
            <div className="panel-surface rounded-[2rem] border border-white/10 p-5 backdrop-blur-xl bg-slate-950/70">
              <p className="text-xs uppercase tracking-[.28em] text-slate-400 font-black mb-4 flex items-center justify-between">
                <span>Nodos en red</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                {networkPoints.map((point, index) => (
                  <div key={point} className="flex items-center gap-2 truncate">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-primary/20 text-[11px] text-brand-primary font-black">
                      {index + 1}
                    </span>
                    <span className="truncate">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-surface relative rounded-[2rem] border border-brand-primary/30 p-5 overflow-hidden backdrop-blur-xl bg-slate-950/80">
              <p className="text-xs uppercase tracking-[.32em] text-brand-primary font-black mb-2">
                Simulación en vivo
              </p>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Hace clic en cualquier nodo de la red o presiona el botón para disparar una ráfaga de datos hacia el centro.
              </p>
              <button
                type="button"
                onClick={handleTriggerNetworkAlert}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-primary/20 border border-brand-primary/50 py-2.5 px-4 text-xs font-black text-white hover:bg-brand-primary hover:shadow-[0_0_20px_rgba(255,90,31,0.5)] active:scale-95 transition"
              >
                <Zap className="w-4 h-4 text-brand-primary group-hover:text-white" />
                Transmitir Alerta de Red
              </button>
            </div>
          </div>
        </aside>

        {/* Right Side: Auth / Access Request Form */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10 z-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel-surface w-full max-w-[520px] rounded-[2.4rem] border border-white/15 bg-slate-950/80 backdrop-blur-2xl p-6 sm:p-9 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            <div className="xl:hidden mb-7 flex items-center justify-between">
              <BrandHeader compact />
              <button
                type="button"
                onClick={handleTriggerNetworkAlert}
                className="flex items-center gap-1.5 rounded-full border border-brand-primary/40 bg-brand-primary/10 px-3 py-1.5 text-xs font-black text-brand-primary active:scale-95 transition"
              >
                <Zap className="w-3.5 h-3.5" />
                Probar Red
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <div className="mb-4 inline-flex rounded-2xl bg-brand-primary p-3 shadow-lg shadow-brand-primary/30">
                  <ShieldAlert className="h-7 w-7 text-white" />
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-black tracking-[-.05em]">
                  {mode === 'intro' && 'Construí tu red de seguridad'}
                  {mode === 'request' && 'Solicitar ingreso'}
                  {mode === 'sent' && 'Solicitud recibida'}
                  {mode === 'login' && 'Ingreso autorizado'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {mode === 'intro' && 'Primero se valida la automotora. Después se habilitan usuarios, reportes, mapa y alertas.'}
                  {mode === 'request' && 'Completa los datos comerciales. El administrador revisará la solicitud antes de activar credenciales.'}
                  {mode === 'sent' && 'Tu alta quedó pendiente de revisión. Te contactaremos cuando se active.'}
                  {mode === 'login' && 'Usa las credenciales entregadas por AutoRed.'}
                </p>
              </div>
              {mode !== 'intro' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('intro');
                    resetFeedback();
                  }}
                  className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition"
                  aria-label="Volver al inicio"
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
                  className="space-y-5"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {capabilityCards.map(([number, text]) => (
                      <div key={number} className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
                        <p className="mb-3 text-xs font-black text-brand-primary tracking-[.3em]">{number}</p>
                        <p className="text-sm leading-6 text-slate-300">{text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="rounded-2xl bg-brand-primary py-4 font-black text-white shadow-lg shadow-brand-primary/30 hover:bg-orange-600 active:scale-[.98] transition"
                    >
                      Ya tengo acceso
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('request')}
                      className="rounded-2xl border border-white/12 bg-white/[.045] py-4 font-black text-white hover:bg-white/[.08] active:scale-[.98] transition"
                    >
                      Solicita tu ingreso aquí
                    </button>
                  </div>

                  {/* Acceso Rápido de Prueba Local */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-brand-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-brand-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Acceso Rápido de Prueba (Local)
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">1-Click Login</span>
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

                  <p className="rounded-2xl border border-sky-400/15 bg-sky-400/8 p-4 text-xs leading-5 text-slate-300">
                    Próxima etapa: reputación entre automotoras, inventario compartido, sensores externos y alerta comunitaria opcional.
                  </p>
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
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Solicitud de Ingreso Enviada</h3>
                    <p className="text-xs leading-relaxed text-emerald-100 font-medium">
                      Su <strong className="text-white">"Solicitud de ingreso"</strong> a la RED de Automotoras fue enviada con Éxito. Favor estar pendiente de su Correo para el seguimiento de su STATUS.
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
                      {/* Notice Banner (Boceto 3) */}
                      <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-xs leading-relaxed text-red-100 shadow-lg">
                        <strong className="block text-xs font-black uppercase tracking-[.28em] text-red-300 mb-1">IMPORTANTE</strong>
                        INGRESAR SOLO DATOS de Automotora y Representante legal para blindar nuestra RED de posibles impostores.
                      </div>

                      <Field icon={<Building2 />} label="Nombre Automotora">
                        <input value={dealershipName} onChange={(e) => setDealershipName(e.target.value)} required className="auth-input" placeholder="Nombre Fantasia / Razón Social" />
                      </Field>
                      <Field icon={<Building2 />} label="RUT Automotora">
                        <input value={rut} onChange={(e) => setRut(e.target.value)} required className="auth-input" placeholder="76.123.456-7" />
                      </Field>
                      <Field icon={<User />} label="Representante Legal / Mail Dueño">
                        <input value={contactName} onChange={(e) => setContactName(e.target.value)} required className="auth-input" placeholder="Nombre completo representante" />
                      </Field>
                      <Field icon={<Phone />} label="Teléfono">
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="auth-input" placeholder="+56 9 1234 5678" />
                      </Field>
                      <Field icon={<Building2 />} label="Dirección Principal">
                        <input value={address} onChange={(e) => setAddress(e.target.value)} required className="auth-input" placeholder="Av. Balmaceda 1234, Coquimbo" />
                      </Field>
                    </>
                  )}

                  <Field icon={<Mail />} label={mode === 'request' ? 'Mail Dueño / Contacto' : 'Correo corporativo'}>
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
                    className="w-full rounded-2xl bg-brand-primary py-3.5 font-black text-white shadow-lg shadow-brand-primary/20 hover:bg-orange-600 active:scale-[.98] disabled:opacity-60 transition"
                  >
                    {loading ? 'Procesando...' : mode === 'request' ? 'Enviar solicitud' : 'Iniciar sesión'}
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
      <div className={`${compact ? 'h-11 w-14' : 'h-12 w-16'} brand-node-badge relative rounded-2xl border border-brand-primary/25 bg-slate-950/70`}>
        <span className="absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-brand-primary shadow-[0_0_18px_rgba(255,90,31,.65)]" />
        <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white/80" />
        <span className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-brand-primary to-white/70" />
        <span className="absolute left-1/2 top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-primary/70" />
        <span className="absolute left-1/2 bottom-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/45" />
      </div>
      <div>
        <p className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-[-.04em]`}>AutoRed <span className="text-brand-primary">Coquimbo</span></p>
        <p className="text-[11px] uppercase tracking-[.32em] text-slate-400 font-black">red privada automotora</p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[.18em] text-slate-400">{label}</span>
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
      ? 'border-red-400/20 bg-red-400/10 text-red-100'
      : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';

  return (
    <div className={`flex gap-2 rounded-2xl border p-3 text-xs leading-5 ${classes}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

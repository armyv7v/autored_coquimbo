import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ShieldAlert, Car, Lock, Mail, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'OWNER' | 'SECURITY'>('SECURITY');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const finalRole = user.email === 'admin@autored.cl' ? 'ADMIN' : 'SECURITY';
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Usuario Google',
          role: finalRole,
          dealershipId: 'TEMP_ID',
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('El inicio de sesión fue cancelado.');
      } else {
        setError('Error al iniciar sesión con Google. ' + (err.message || 'Error desconocido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico para restablecer la contraseña.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError('No pudimos enviar el correo de recuperación. Verifica que el correo sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Sync check: ensure profile exists (handles previous failed registrations)
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const finalRole = email === 'admin@autored.cl' ? 'ADMIN' : 'SECURITY';
          await setDoc(docRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Usuario Reincorporado',
            role: finalRole,
            dealershipId: 'TEMP_ID',
            status: 'ACTIVE',
            createdAt: serverTimestamp()
          });
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        // Auto-assign ADMIN role to specific email
        const finalRole = email === 'admin@autored.cl' ? 'ADMIN' : role;

        // Create profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: name,
          role: finalRole,
          dealershipId: 'TEMP_ID', 
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Login/Reg error code:", err.code);
      console.error("Login/Reg error message:", err.message);
      
      const errorCode = err.code || '';
      const errorMessage = err.message || '';

      if (errorCode === 'auth/invalid-credential' || errorMessage.includes('invalid-credential')) {
        setError(email === 'admin@autored.cl' 
          ? 'Error de acceso para Administrador. Si es la primera vez que ingresas en este ambiente, por favor utiliza la pestaña "Registro" abajo para crear la cuenta admin primero.'
          : 'Credenciales inválidas. Por favor verifique su correo y contraseña o regístrese si es nuevo.');
      } else if (errorCode === 'auth/user-not-found' || errorMessage.includes('user-not-found')) {
        setError('No existe una cuenta con este correo.');
      } else if (errorCode === 'auth/wrong-password' || errorMessage.includes('wrong-password')) {
        setError('Contraseña incorrecta.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setError('Este correo ya está en uso. Intenta iniciar sesión.');
      } else if (errorCode === 'auth/weak-password') {
        setError('La contraseña es muy débil (min. 6 caracteres).');
      } else if (errorCode === 'permission-denied') {
        setError('Error de permisos en base de datos. Por favor contacte al administrador.');
      } else {
        setError('Error: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-primary rounded-full blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-primary p-4 rounded-2xl mb-4 shadow-lg shadow-brand-primary/20">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AutoRed <span className="text-brand-primary">Coquimbo</span></h1>
          <p className="text-slate-400 text-sm mt-2 text-center px-4">Seguridad Colaborativa para Automotoras</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-5 overflow-hidden"
              >
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
                    <button 
                        type="button"
                        onClick={() => setRole('SECURITY')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${role === 'SECURITY' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
                    >
                        SEGURIDAD
                    </button>
                    <button 
                        type="button"
                        onClick={() => setRole('OWNER')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${role === 'OWNER' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
                    >
                        PROPIETARIO
                    </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="email"
              placeholder="Correo corporativo"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-400 text-xs bg-red-400/10 p-4 rounded-lg border border-red-400/20 flex flex-col gap-2"
            >
              <div className="flex gap-3">
                <Info className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {isLogin && error.includes('registrada') && (
                <button 
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-brand-primary font-bold hover:underline self-start ml-7"
                >
                  Ir a Registro →
                </button>
              )}
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-emerald-400 text-xs bg-emerald-400/10 p-4 rounded-lg border border-emerald-400/20 flex gap-3"
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/20 transition-all transform active:scale-95 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'INICIAR SESIÓN' : 'REGISTRARME'
            )}
          </button>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-all uppercase tracking-widest font-bold"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">O CONTINUAR CON</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            GOOGLE
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className="text-slate-400 text-sm hover:text-white transition-all underline underline-offset-4"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

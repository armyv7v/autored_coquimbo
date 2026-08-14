import React, { useState, useRef } from 'react';
import { ShieldAlert, X, AlertTriangle, Camera, MapPin, Send, Check, Loader2, Info, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { db, auth, storage } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getGeohash, COQUIMBO_CENTER } from '../lib/geoutils';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { safeUUID } from '../lib/uuid';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapPicker({ position, setPosition }: { position: [number, number]; setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return <Marker position={position} icon={DefaultIcon} />;
}

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IncidentReportForm({ isOpen, onClose }: IncidentReportFormProps) {
  const [type, setType] = useState<'ROBO' | 'SOSPECHOSO' | 'MARCAJE' | 'OTRO' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [location, setLocation] = useState<[number, number]>(COQUIMBO_CENTER);
  const [usingGps, setUsingGps] = useState(false);
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const requestGps = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation([pos.coords.latitude, pos.coords.longitude]);
        setUsingGps(true);
      }, (err) => {
        console.error("GPS Error:", err);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !auth.currentUser) return;

    setLoading(true);
    setError(null);
    try {
      let imageUrl = '';
      if (image) {
        const storageRef = ref(storage, `incidents/${safeUUID()}-${image.name}`);
        const uploadResult = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const geohash = getGeohash(location[0], location[1]);
      const incidentId = safeUUID();
      const incidentData = {
        id: incidentId,
        type,
        description,
        reporterId: auth.currentUser.uid,
        dealershipId: profile?.dealershipId || 'UNKNOWN',
        location: {
          lat: location[0],
          lng: location[1],
        },
        geohash,
        imageUrl,
        status: 'OPEN',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(collection(db, 'incidents'), incidentId), incidentData);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          setError(parsed.error || err.message);
        } catch (_) {
          setError(err.message);
        }
      } else {
        setError(String(err));
      }
      handleFirestoreError(err, OperationType.WRITE, 'incidents');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setType(null);
    setDescription('');
    setImage(null);
    setImagePreview(null);
    setLocation(COQUIMBO_CENTER);
    setUsingGps(false);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4"
        >
          {/* Backdrop Click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-[2rem] sm:rounded-2xl border-2 border-red-500/90 bg-slate-950 shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="flex sm:hidden justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-red-500/50" />
            </div>

            <div className="p-4 border-b border-red-500/30 bg-gradient-to-r from-red-950/50 via-slate-950 to-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-md shadow-red-950">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    REPORTE DE INCIDENTE
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">ALERTA</span>
                  </h2>
                  <p className="text-xs text-red-300/80">Notificación inmediata a la red de concesionarias</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto text-left">
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 block">
                  Tipo de Evento
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'ROBO', label: 'Robo / Asalto', icon: ShieldAlert, border: 'border-red-500/50 bg-red-500/15 text-red-200' },
                    { id: 'SOSPECHOSO', label: 'Sospechoso / Marcaje', icon: AlertTriangle, border: 'border-amber-500/50 bg-amber-500/15 text-amber-200' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                          navigator.vibrate?.(10);
                        }
                        setType(item.id as any);
                      }}
                      className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 active:scale-[0.98] ${
                        type === item.id 
                          ? item.border 
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Descripción del Hecho
                </label>
                <div className="relative">
                  <textarea
                    placeholder="Describe los hechos, características de los individuos o vehículos sospechosos..."
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 pr-10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-red-500/60 transition min-h-[90px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    title="Nota de Voz / Transcribir Audio"
                    onClick={() => {
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) {
                        alert("El navegador no soporta transcripción por voz directa. Puedes escribir el texto manualmente.");
                        return;
                      }
                      const recognition = new SpeechRecognition();
                      recognition.lang = 'es-CL';
                      recognition.onstart = () => {
                        setDescription((prev) => prev + " [Grabando...] ");
                      };
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        setDescription((prev) => prev.replace(" [Grabando...] ", "") + " " + transcript);
                      };
                      recognition.onerror = () => {
                        setDescription((prev) => prev.replace(" [Grabando...] ", ""));
                      };
                      recognition.start();
                    }}
                    className="absolute right-2.5 bottom-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                        imagePreview 
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      {imagePreview ? 'Foto Cargada' : 'Adjuntar Foto'}
                    </button>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setPickingLocation(true)}
                    className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                      usingGps 
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {usingGps ? 'Punto GPS OK' : 'Fijar Posición'}
                  </button>
                </div>

                {imagePreview && (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-800">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-lg text-white shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <p className="font-medium leading-relaxed">{error}</p>
                </div>
              )}
            </form>

            <footer className="border-t border-slate-800/80 bg-slate-950 p-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !type}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white h-12 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Transmitir Alerta a la Red
              </button>
            </footer>

            <AnimatePresence>
              {pickingLocation && (
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="absolute inset-0 z-50 bg-slate-950 flex flex-col"
                >
                  <div className="p-4 flex items-center justify-between border-b border-slate-800">
                    <h3 className="text-white font-bold text-xs uppercase tracking-wider font-mono">Ubicar en Mapa Táctico</h3>
                    <button onClick={() => setPickingLocation(false)} className="p-1 text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <MapContainer center={location} zoom={15} className="h-full w-full">
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                      <MapPicker position={location} setPosition={(pos) => { setLocation(pos); setUsingGps(true); }} />
                    </MapContainer>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
                      <button 
                        type="button"
                        onClick={requestGps}
                        className="bg-slate-900 border border-slate-700 text-white px-5 h-11 rounded-xl shadow-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5 text-sky-400" /> Mi GPS
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPickingLocation(false)}
                        className="bg-brand-primary text-white px-5 h-11 rounded-xl shadow-2xl font-bold text-xs uppercase tracking-wider"
                      >
                        Fijar Ubicación
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

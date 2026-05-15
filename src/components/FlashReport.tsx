import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, Camera, MapPin, Send, Image as ImageIcon, Check, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { db, auth, storage } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getGeohash, COQUIMBO_CENTER } from '../lib/geoutils';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

function MapPicker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker position={position} icon={DefaultIcon} />
  );
}

export default function FlashReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'ROBO' | 'SOSPECHOSO' | 'MARCAJE' | 'OTRO' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [location, setLocation] = useState<[number, number]>(COQUIMBO_CENTER);
  const [usingGps, setUsingGps] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !auth.currentUser) return;
    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    if (!type || !auth.currentUser) return;
    setShowConfirmation(false);
    setLoading(true);
    try {
      let imageUrl = '';
      if (image) {
        const storageRef = ref(storage, `incidents/${crypto.randomUUID()}-${image.name}`);
        const uploadResult = await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const geohash = getGeohash(location[0], location[1]);

      const incidentId = crypto.randomUUID();
      const incidentData = {
        id: incidentId,
        type,
        description,
        reporterId: auth.currentUser.uid,
        dealershipId: profile?.dealershipId || 'TEMP_ID',
        location: { lat: location[0], lng: location[1], geohash },
        imageUrl,
        status: 'OPEN',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'incidents', incidentId), incidentData);
      
      const alertId = crypto.randomUUID();
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        incidentId: incidentId,
        createdAt: serverTimestamp(),
        notifiedDealershipIds: [] 
      });

      setIsOpen(false);
      resetForm();
    } catch (err) {
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
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 z-50 bg-red-600 hover:bg-red-700 text-white p-6 rounded-full shadow-[0_0_40px_rgba(220,38,38,0.5)] border-4 border-red-500/50 flex items-center justify-center alert-pulse overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        <ShieldAlert className="w-8 h-8 relative z-10" />
        <span className="ml-2 font-black tracking-tighter relative z-10 hidden md:inline">PANIC BUTTON</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotateX: 20 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, y: 50, rotateX: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-[0_20px_100px_-20px_rgba(220,38,38,0.3)] relative"
              id="flash-report-panel"
            >
              {/* Premium Glow Effect */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-primary/20 blur-[80px] pointer-events-none" />

              <div className="bg-gradient-to-br from-red-600/20 to-transparent p-8 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-600/40 rotate-3">
                    <AlertTriangle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">ALERTA FLASH</h2>
                    <p className="text-red-400/60 text-[10px] font-bold uppercase tracking-[0.2em]">Red de Seguridad Coquimbo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white p-3 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-4 block pl-1">Seleccionar Emergencia</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: 'ROBO', label: 'Robo / Asalto', color: 'bg-red-600', icon: ShieldAlert },
                      { id: 'SOSPECHOSO', label: 'Sospechoso', color: 'bg-orange-600', icon: AlertTriangle },
                      { id: 'MARCAJE', label: 'Marcaje', color: 'bg-blue-600', icon: MapPin },
                      { id: 'OTRO', label: 'Otro / Info', color: 'bg-slate-600', icon: Info }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setType(item.id as any)}
                        className={`group p-5 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden ${type === item.id ? `border-white/50 ${item.color} text-white scale-105 shadow-xl` : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/20 hover:bg-white/10'}`}
                      >
                        <item.icon className={`w-8 h-8 transition-transform group-hover:rotate-12 ${type === item.id ? 'text-white' : 'text-slate-600'}`} />
                        <span className="text-[9px] font-black text-center leading-tight uppercase tracking-widest">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative group">
                     <textarea
                      placeholder="¿Qué está pasando? Sé breve y específico..."
                      className="w-full bg-white/5 border border-white/5 rounded-3xl p-6 text-white text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition-all min-h-[100px] placeholder:text-slate-600"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-600">
                      {description.length}/500
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                        id="photo-upload-input"
                      />
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${imagePreview ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-400 select-none'}`}
                      >
                        {imagePreview ? <Check className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                        {imagePreview ? 'Imagen lista' : 'Adjuntar Foto'}
                      </button>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setPickingLocation(true)}
                      className={`flex-1 h-14 flex items-center justify-center gap-3 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${usingGps ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20 text-slate-400 underline decoration-dotted decoration-slate-700'}`}
                    >
                      <MapPin className="w-5 h-5" />
                      {usingGps ? 'Ubicación OK' : 'Fijar Ubicación'}
                    </button>
                  </div>

                  {imagePreview && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="relative w-full h-40 rounded-[2rem] overflow-hidden border-2 border-white/10 group"
                    >
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button 
                        type="button"
                        onClick={() => { setImage(null); setImagePreview(null); }}
                        className="absolute top-4 right-4 bg-red-600 p-2.5 rounded-2xl text-white shadow-xl hover:bg-red-700 active:scale-95 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !type}
                  className="w-full group relative h-20 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-[2rem] shadow-2xl shadow-red-600/30 transition-all flex items-center justify-center gap-4 transform active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                  ) : (
                    <>
                      <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span className="text-xl font-black tracking-tighter italic">ENVIAR ALERTA RED</span>
                    </>
                  )}
                </button>
              </form>

              {/* Internal Map Picker Overlay */}
              <AnimatePresence>
                {showConfirmation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40 bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-8"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="text-center space-y-6"
                    >
                      <div className="bg-red-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-600/40 animate-pulse">
                        <AlertTriangle className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">¿Confirmar Alerta?</h3>
                        <p className="text-slate-400 text-xs leading-relaxed max-w-[240px] mx-auto font-medium">
                          Esta acción notificará inmediatamente a toda la red de seguridad.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={confirmSubmit}
                          className="w-full h-14 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 active:scale-95"
                        >
                          SÍ, ENVIAR AHORA
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmation(false)}
                          className="w-full h-14 bg-slate-800 text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all active:scale-95"
                        >
                          CANCELAR
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Internal Map Picker Overlay */}
              <AnimatePresence>
                {pickingLocation && (
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 200 }}
                    className="absolute inset-0 z-20 bg-slate-900 flex flex-col"
                  >
                    <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
                       <div className="flex items-center gap-3">
                         <div className="bg-blue-600/20 p-2 rounded-xl">
                           <MapPin className="w-6 h-6 text-blue-500" />
                         </div>
                         <h3 className="text-white font-black text-sm uppercase tracking-widest">Punto de Incidente</h3>
                       </div>
                       <button onClick={() => setPickingLocation(false)} className="bg-white/5 p-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                         <X className="w-5 h-5" />
                       </button>
                    </div>
                    <div className="flex-1 relative">
                       <MapContainer center={location} zoom={15} className="h-full w-full grayscale-[0.8] contrast-[1.2]">
                         <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                         <MapPicker position={location} setPosition={(pos) => { setLocation(pos); setUsingGps(true); }} />
                       </MapContainer>
                       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-3">
                         <button 
                           onClick={requestGps}
                           className="bg-white text-slate-900 px-6 h-14 rounded-2xl shadow-2xl hover:bg-slate-100 flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                         >
                           <MapPin className="w-5 h-5" />
                           GPS Actual
                         </button>
                         <button 
                          onClick={() => setPickingLocation(false)}
                          className="bg-blue-600 text-white px-8 h-14 rounded-2xl shadow-2xl hover:bg-blue-700 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                         >
                           Confirmar Punto
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
    </>
  );
}

// Add animation to index.css or local style block if needed
// @keyframes shimmer {
//   100% { transform: translateX(100%); }
// }



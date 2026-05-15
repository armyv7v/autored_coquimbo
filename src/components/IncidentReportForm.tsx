import React, { useState, useRef } from 'react';
import { ShieldAlert, X, AlertTriangle, Camera, MapPin, Send, Check, Loader2, Info } from 'lucide-react';
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

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IncidentReportForm({ isOpen, onClose }: IncidentReportFormProps) {
  const [type, setType] = useState<'ROBO' | 'SOSPECHOSO' | 'MARCAJE' | 'OTRO' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
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
        dealershipId: profile?.dealershipId || 'DASHBOARD_UI',
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

      onClose();
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">Reportar Incidente</h2>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Nueva Entrada de Seguridad</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-3 block">Tipo de Emergencia</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'ROBO', label: 'Robo', color: 'bg-red-600', icon: ShieldAlert },
                    { id: 'SOSPECHOSO', label: 'Sospechoso', color: 'bg-orange-600', icon: AlertTriangle },
                    { id: 'MARCAJE', label: 'Marcaje', color: 'bg-blue-600', icon: MapPin },
                    { id: 'OTRO', label: 'Otro', color: 'bg-slate-600', icon: Info }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${type === item.id ? `border-white/50 ${item.color} text-white` : 'border-slate-800 bg-slate-800/50 text-slate-500 hover:border-slate-700'}`}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  placeholder="Describe lo ocurrido con detalles relevantes..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-brand-primary transition-all min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                   <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${imagePreview ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                    >
                      <Camera className="w-4 h-4" />
                      {imagePreview ? 'Foto Lista' : 'Subir Foto'}
                    </button>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setPickingLocation(true)}
                    className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${usingGps ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                  >
                    <MapPin className="w-4 h-4" />
                    {usingGps ? 'Punto Fijado' : 'Ubicación'}
                  </button>
                </div>

                {imagePreview && (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-700">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-lg text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !type}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 text-white h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-900/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Emitir Alerta Crítica
              </button>
            </form>

            <AnimatePresence>
              {pickingLocation && (
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  className="absolute inset-0 z-50 bg-slate-900 flex flex-col"
                >
                  <div className="p-4 flex items-center justify-between border-b border-slate-800">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest">Ubicar en Mapa</h3>
                    <button onClick={() => setPickingLocation(false)} className="text-slate-400 hover:text-white">
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
                        className="bg-white text-slate-900 px-6 h-12 rounded-xl shadow-2xl font-bold text-xs uppercase tracking-widest"
                      >
                        Mi GPS
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPickingLocation(false)}
                        className="bg-brand-primary text-white px-6 h-12 rounded-xl shadow-2xl font-bold text-xs uppercase tracking-widest"
                      >
                        Confirmar
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

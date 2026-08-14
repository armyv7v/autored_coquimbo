import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, X, AlertTriangle, Camera, MapPin, Send, Check, Loader2, Info, Share2, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { db, auth, storage } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getGeohash, COQUIMBO_CENTER } from '../lib/geoutils';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { safeUUID } from '../lib/uuid';
import AlertConfirmationModal from './AlertConfirmationModal';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { formatWhatsAppFlashReport } from '../lib/executiveReport';

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
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);
  const [type, setType] = useState<'ROBO' | 'SOSPECHOSO' | 'MARCAJE' | 'OTRO' | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [location, setLocation] = useState<[number, number]>(COQUIMBO_CENTER);
  const [usingGps, setUsingGps] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
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

  const getPreviewText = () => {
    return formatWhatsAppFlashReport({
      id: 'DRAFT',
      type: type || 'ALERTA',
      description,
      dealershipId: profile?.dealershipId,
      createdAt: new Date().toISOString(),
      location: { lat: location[0], lng: location[1] }
    }, profile?.displayName || profile?.email);
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(getPreviewText());
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
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
        dealershipId: profile?.dealershipId || 'CENTRAL',
        location: { lat: location[0], lng: location[1], geohash },
        imageUrl,
        status: 'OPEN',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'incidents', incidentId), incidentData);
      
      const alertId = safeUUID();
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        incidentId: incidentId,
        createdAt: serverTimestamp(),
        notifiedDealershipIds: [] 
      });

      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error in confirmSubmit:", err);
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

  useEffect(() => {
    const handleOpen = () => setShowAlertConfirm(true);
    window.addEventListener('open-flash-report', handleOpen);
    return () => window.removeEventListener('open-flash-report', handleOpen);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:max-w-lg bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-red-950/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/40">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                      Alerta Máxima / Flash Report
                    </h3>
                    <p className="text-xs text-red-400 font-mono">
                      Notificación inmediata a toda la red
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block mb-2">
                    Tipo de Emergencia
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ROBO', label: 'Robo', icon: ShieldAlert, activeColor: 'bg-red-600 border-red-500 text-white' },
                      { id: 'SOSPECHOSO', label: 'Sospechoso', icon: AlertTriangle, activeColor: 'bg-amber-600 border-amber-500 text-white' },
                      { id: 'MARCAJE', label: 'Marcaje', icon: MapPin, activeColor: 'bg-sky-600 border-sky-500 text-white' },
                      { id: 'OTRO', label: 'Otro', icon: Info, activeColor: 'bg-slate-700 border-slate-600 text-white' }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = type === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setType(item.id as any)}
                          className={`p-3 rounded-2xl border text-left flex flex-col items-center gap-1.5 transition ${
                            isSelected
                              ? item.activeColor
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[11px] font-mono font-bold uppercase">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 font-bold block">
                    Descripción del Suceso
                  </label>
                  <textarea
                    placeholder="Detalles clave: personas involucradas, patente, dirección de fuga..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 min-h-[90px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Sé lo más conciso posible</span>
                    <span>{description.length}/500</span>
                  </div>
                </div>

                {/* Quick Attachments */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
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
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition ${
                        imagePreview
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      {imagePreview ? 'Foto Cargada' : 'Adjuntar Foto'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPickingLocation(true)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition ${
                      usingGps
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {usingGps ? 'Punto Fijado' : 'Fijar Mapa'}
                  </button>
                </div>

                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-32">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-slate-950/80 p-1.5 rounded-lg text-slate-400 hover:text-white border border-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                    {error}
                  </div>
                )}

                {/* WhatsApp Text Preview & Quick Copy */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                      Copia Táctica para WhatsApp
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedWhatsApp ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedWhatsApp ? 'Copiado' : 'Copiar Texto'}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap max-h-20 overflow-y-auto leading-relaxed">
                    {getPreviewText()}
                  </pre>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={loading || !type}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Disparar Alerta Red
                  </button>
                </div>
              </form>

              {/* Internal Map Picker Overlay */}
              <AnimatePresence>
                {pickingLocation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 bg-slate-950 flex flex-col"
                  >
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Seleccionar Coordenadas en el Mapa
                      </h4>
                      <button
                        onClick={() => setPickingLocation(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 relative">
                      <MapContainer center={location} zoom={15} className="h-full w-full">
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                        <MapPicker position={location} setPosition={(pos) => { setLocation(pos); setUsingGps(true); }} />
                      </MapContainer>
                      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex gap-2">
                        <button
                          type="button"
                          onClick={requestGps}
                          className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs font-bold uppercase"
                        >
                          Mi GPS
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickingLocation(false)}
                          className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-mono text-xs font-bold uppercase"
                        >
                          Fijar Punto
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirmation Prompt */}
              <AnimatePresence>
                {showConfirmation && (
                  <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
                    <div className="space-y-4 max-w-xs">
                      <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-red-950 animate-pulse">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base uppercase">¿Confirmar Alerta Máxima?</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Se emitirá una notificación de alta prioridad a todas las automotoras de la red.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          onClick={confirmSubmit}
                          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider"
                        >
                          Confirmar y Emitir
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmation(false)}
                          className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs font-bold uppercase"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AlertConfirmationModal
        isOpen={showAlertConfirm}
        onClose={() => setShowAlertConfirm(false)}
        onOpenDetailedReport={() => {
          setShowAlertConfirm(false);
          setIsOpen(true);
        }}
      />
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShieldAlert, MapPin, Layers, CheckCircle2, AlertTriangle, XCircle, Clock, Radio, Users, Share2, Building2, Zap, Plus, Send, Camera, X, Loader2, ZoomIn, ZoomOut, Target, Search, ArrowRight, Settings2, Sparkles } from 'lucide-react';
import { COQUIMBO_CENTER, getGeohash } from '../lib/geoutils';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'motion/react';
import { safeUUID } from '../lib/uuid';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Incident {
  id: string;
  type: string;
  description: string;
  location: { lat: number; lng: number; geohash: string };
  createdAt: string;
  status: 'OPEN' | 'RESOLVED' | 'FALSE_ALARM';
  dealershipId: string;
  reporterId: string;
  imageUrl?: string;
}

interface Dealership {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  status?: 'online' | 'offline';
  lastSeen?: string;
  latitude?: number;
  longitude?: number;
}

const HEARTBEAT_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// Heatmap Layer Component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // @ts-ignore - leaflet.heat is not typed
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: '#3b82f6', 0.65: '#eab308', 1: '#ef4444' }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

// Map Controller for Deep Links
function MapEffect({ selectedId, incidents }: { selectedId: string | null; incidents: Incident[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedId && incidents.length > 0) {
      const incident = incidents.find((i) => i.id === selectedId);
      if (incident) {
        map.setView([incident.location.lat, incident.location.lng], 16, { animate: true });
      }
    }
  }, [selectedId, incidents, map]);

  return null;
}

function MapClickHandler({ active, onClick }: { active: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (active) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Custom Zoom Controls
function ZoomControls() {
  const map = useMap();
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition shadow-xl backdrop-blur-xl active:scale-95"
        title="Acercar"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition shadow-xl backdrop-blur-xl active:scale-95"
        title="Alejar"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.setView(COQUIMBO_CENTER, 14, { animate: true })}
        className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-300 hover:text-brand-primary transition shadow-xl backdrop-blur-xl active:scale-95"
        title="Centrar Coquimbo"
      >
        <Target className="w-4 h-4" />
      </button>
    </div>
  );
}

// Search Interface
interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
  type: 'address' | 'dealership';
  id?: string;
}

function SearchBar({ dealerships }: { dealerships: Dealership[] }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const localResults: SearchResult[] = dealerships
        .filter((d) => d.name.toLowerCase().includes(val.toLowerCase()))
        .map((d) => ({
          display_name: d.name,
          lat: d.latitude ?? d.location?.lat ?? COQUIMBO_CENTER[0],
          lon: d.longitude ?? d.location?.lng ?? COQUIMBO_CENTER[1],
          type: 'dealership',
          id: d.id,
        }));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' Coquimbo Chile')}&limit=5`
      );
      const data = await response.json();
      const apiResults: SearchResult[] = data.map((item: any) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: 'address',
      }));

      setResults([...localResults, ...apiResults]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    map.setView([result.lat, result.lon], 16, { animate: true });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2.5 bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 shadow-xl backdrop-blur-xl">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar automotora, calle o zona..."
          className="bg-transparent border-none outline-none text-white text-xs flex-1 placeholder:text-slate-500 font-medium"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {isSearching && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
        {query && !isSearching && (
          <button onClick={() => { setQuery(''); setResults([]); }}>
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[2000] backdrop-blur-xl">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => selectResult(r)}
              className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors border-b border-slate-800 last:border-none flex items-center gap-3 group"
            >
              {r.type === 'dealership' ? (
                <Building2 className="w-4 h-4 text-brand-primary" />
              ) : (
                <MapPin className="w-4 h-4 text-slate-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-brand-primary transition-colors">
                  {r.display_name}
                </p>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {r.type === 'dealership' ? 'Sede AutoRed' : 'Ubicación'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MapView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [now, setNow] = useState(Date.now());
  const [tileProvider, setTileProvider] = useState<'DARK' | 'SATELLITE'>('DARK');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showDealerships, setShowDealerships] = useState(true);
  const [alertingId, setAlertingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const selectedIncidentId = searchParams.get('incident');
  const { profile } = useAuth();

  // Reporting State
  const [isReportingMode, setIsReportingMode] = useState(false);
  const [reportLocation, setReportLocation] = useState<[number, number] | null>(null);
  const [reportType, setReportType] = useState<'ROBO' | 'SOSPECHOSO' | 'MARCAJE' | 'OTRO' | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);

  // Filters State
  const [filterTypes, setFilterTypes] = useState<string[]>(['ROBO', 'SOSPECHOSO', 'MARCAJE']);
  const [filterStatus, setFilterStatus] = useState<string[]>(['OPEN', 'RESOLVED']);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Incident[];
      setIncidents(data);
    });

    const unsubDealerships = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Dealership[];
      setDealerships(data);
    });

    return () => {
      unsubIncidents();
      unsubDealerships();
    };
  }, []);

  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    const path = `incidents/${incidentId}`;
    try {
      const incidentRef = doc(db, 'incidents', incidentId);
      await updateDoc(incidentRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleTriggerAlert = async (incident: Incident) => {
    setAlertingId(incident.id);
    const path = 'alerts';
    try {
      await addDoc(collection(db, path), {
        id: safeUUID(),
        incidentId: incident.id,
        triggeredManually: true,
        triggeredBy: profile?.uid || 'unknown',
        createdAt: serverTimestamp(),
        notifiedDealershipIds: [],
      });
      alert('Alerta de Red Disparada Exitosamente');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setAlertingId(null);
    }
  };

  const handleShare = (incidentId: string) => {
    const url = `${window.location.origin}/map?incident=${incidentId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyingId(incidentId);
      setTimeout(() => setCopyingId(null), 2000);
    });
  };

  const handleUpdateDealerStatus = async (dealerId: string, newStatus: 'online' | 'offline') => {
    const path = `dealerships/${dealerId}`;
    try {
      const dealerRef = doc(db, 'dealerships', dealerId);
      await updateDoc(dealerRef, {
        status: newStatus,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setReportLocation([lat, lng]);
    setIsReportingMode(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReportImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType || !reportLocation || !auth.currentUser) return;

    setIsSubmitting(true);
    setError(null);
    try {
      let imageUrl = '';
      if (reportImage) {
        const storageRef = ref(storage, `incidents/${safeUUID()}-${reportImage.name}`);
        const uploadResult = await uploadBytes(storageRef, reportImage);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const geohash = getGeohash(reportLocation[0], reportLocation[1]);
      const incidentId = safeUUID();

      const incidentData = {
        id: incidentId,
        type: reportType,
        description: reportDescription,
        reporterId: auth.currentUser.uid,
        dealershipId: profile?.dealershipId || 'MAP_UI',
        location: { lat: reportLocation[0], lng: reportLocation[1], geohash },
        imageUrl,
        status: 'OPEN',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'incidents', incidentId), incidentData);

      const alertId = safeUUID();
      await setDoc(doc(db, 'alerts', alertId), {
        id: alertId,
        incidentId: incidentId,
        createdAt: serverTimestamp(),
        notifiedDealershipIds: [],
      });

      setReportLocation(null);
      setReportType(null);
      setReportDescription('');
      setReportImage(null);
      setReportImagePreview(null);
    } catch (err) {
      console.error('Error in handleSubmitReport:', err);
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
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter(
    (incident) =>
      filterTypes.includes(incident.type) && filterStatus.includes(incident.status || 'OPEN')
  );

  const heatPoints: [number, number, number][] = filteredIncidents.map((incident) => [
    incident.location.lat,
    incident.location.lng,
    1,
  ]);

  return (
    <div className="map-command-shell h-full w-full relative overflow-hidden">
      <MapContainer
        center={COQUIMBO_CENTER}
        zoom={14}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          url={
            tileProvider === 'DARK'
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }
          attribution="&copy; CARTO &copy; Esri"
        />

        <MapEffect selectedId={selectedIncidentId} incidents={incidents} />
        <MapClickHandler active={isReportingMode} onClick={handleMapClick} />

        {/* Tactical Top Bar Controls */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          <div className="w-full sm:max-w-sm pointer-events-auto">
            <SearchBar dealerships={dealerships} />
          </div>

          {/* Quick Layer Switcher Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/90 border border-slate-800 shadow-xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setTileProvider((prev) => (prev === 'DARK' ? 'SATELLITE' : 'DARK'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition ${
                tileProvider === 'SATELLITE'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {tileProvider === 'SATELLITE' ? 'Satélite HD' : 'Mapa Táctico'}
            </button>

            <button
              type="button"
              onClick={() => setShowHeatmap((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition ${
                showHeatmap
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Calor
            </button>

            <button
              type="button"
              onClick={() => setShowDealerships((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition ${
                showDealerships
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-500 hover:text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Nodos
            </button>
          </div>
        </div>

        <div className="absolute bottom-24 right-4 z-[1000]">
          <ZoomControls />
        </div>

        {showHeatmap && <HeatmapLayer points={heatPoints} />}

        {showDealerships &&
          dealerships.map((dealer) => {
            const lat = dealer.latitude ?? dealer.location?.lat;
            const lng = dealer.longitude ?? dealer.location?.lng;
            if (lat === undefined || lng === undefined) return null;
            const position: [number, number] = [lat, lng];

            let isHeartbeatOnline = false;
            if (dealer.lastSeen) {
              const lastSeenTime = new Date(dealer.lastSeen).getTime();
              isHeartbeatOnline = now - lastSeenTime < HEARTBEAT_THRESHOLD_MS;
            }
            const isOnline = dealer.status === 'online' || (dealer.status !== 'offline' && isHeartbeatOnline);

            return (
              <React.Fragment key={dealer.id}>
                <Circle
                  center={position}
                  radius={250}
                  pathOptions={{
                    color: isOnline ? '#0ea5e9' : '#64748b',
                    fillColor: isOnline ? '#0ea5e9' : '#64748b',
                    fillOpacity: 0.08,
                    weight: 1,
                    dashArray: '4, 4',
                  }}
                />
                <Marker
                  position={position}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="w-8 h-8 rounded-xl border border-white/20 shadow-lg flex items-center justify-center ${isOnline ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
                    </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                >
                  <Popup>
                    <div className="p-4 w-72 bg-slate-950/95 border border-slate-800 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800/80">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isOnline ? 'bg-sky-600' : 'bg-slate-800'}`}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-xs truncate leading-tight flex items-center gap-2">
                            {dealer.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                            <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {isOnline ? 'Conectado / En Red' : 'Desconectado'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800/60">
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Sede oficial integrante de la Red de Seguridad Automotriz AutoRed.
                          </p>
                        </div>

                        <div className="flex items-center justify-between px-1 text-[11px] font-mono">
                          <span className="text-slate-400 uppercase tracking-wider">Último Pulso</span>
                          <span className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {dealer.lastSeen ? new Date(dealer.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </span>
                        </div>

                        {(['ADMIN', 'SECURITY'].includes(profile?.role || '') || profile?.dealershipId === dealer.id) && (
                          <button
                            onClick={() => handleUpdateDealerStatus(dealer.id, isOnline ? 'offline' : 'online')}
                            className={`w-full py-2.5 rounded-xl font-mono text-[11px] uppercase font-bold tracking-wider transition flex items-center justify-center gap-2 ${
                              isOnline
                                ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {isOnline ? 'Desconectar Nodo' : 'Conectar a la Red'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

        {showMarkers &&
          incidents
            .filter(
              (incident) =>
                (filterTypes.includes(incident.type) && filterStatus.includes(incident.status || 'OPEN')) ||
                incident.id === selectedIncidentId
            )
            .map((incident) => {
              const isSelected = incident.id === selectedIncidentId;
              const typeColor =
                incident.type === 'ROBO' ? '#ef4444' : incident.type === 'SOSPECHOSO' ? '#f97316' : '#0ea5e9';

              return (
                <Marker
                  key={incident.id}
                  position={[incident.location.lat, incident.location.lng]}
                  icon={L.divIcon({
                    className: 'incident-icon',
                    html: `
                      <div class="relative flex items-center justify-center">
                        ${isSelected ? `<div class="absolute w-12 h-12 bg-red-500/30 rounded-full animate-ping"></div>` : ''}
                        <div class="w-8 h-8 rounded-xl border border-white/20 shadow-xl flex items-center justify-center transition-all ${isSelected ? 'scale-125 z-[1001]' : ''}" style="background-color: ${typeColor}; color: white;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/></svg>
                        </div>
                      </div>
                    `,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  })}
                  ref={(ref) => {
                    if (ref && isSelected) {
                      ref.openPopup();
                    }
                  }}
                >
                  <Popup>
                    <div className="p-4 w-72 bg-slate-950/95 border border-slate-800 rounded-2xl text-slate-100 shadow-2xl backdrop-blur-xl">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              incident.type === 'ROBO' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <h4 className="font-mono font-bold uppercase text-xs tracking-wider text-white">
                            {incident.type}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            incident.status === 'RESOLVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : incident.status === 'FALSE_ALARM'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {incident.status || 'OPEN'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {incident.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-slate-800 h-32 relative group">
                            <img src={incident.imageUrl} alt="Evidencia" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-xs text-slate-300 leading-relaxed">{incident.description || 'Sin descripción.'}</p>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                          <span>Sede: {incident.dealershipId}</span>
                          <span>{new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          {profile?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleUpdateStatus(incident.id, incident.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')}
                              className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-white transition"
                            >
                              {incident.status === 'RESOLVED' ? 'Reabrir' : 'Resolver'}
                            </button>
                          )}
                          <button
                            onClick={() => handleShare(incident.id)}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                            title="Copiar Enlace"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
      </MapContainer>

      {/* Floating Bottom Metrics Pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] hidden sm:flex items-center gap-2 p-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-slate-400">Incidentes:</span>
          <span className="font-bold text-white tabular-nums">{filteredIncidents.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Nodos Activos:</span>
          <span className="font-bold text-white tabular-nums">{dealerships.length}</span>
        </div>
      </div>
    </div>
  );
}

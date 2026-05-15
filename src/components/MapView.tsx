import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ShieldAlert, Info, MapPin, Layers, CheckCircle2, AlertTriangle, XCircle, Clock, Radio, Users, Share2, Building2, Zap, Plus, Send, Camera, X, Loader2, ZoomIn, ZoomOut, Target, Search, ArrowRight } from 'lucide-react';
import { COQUIMBO_CENTER, getGeohash } from '../lib/geoutils';
import { useAuth } from '../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useMapEvents } from 'react-leaflet';

// Fix for default marker icons in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
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
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
}

// Map Controller for Deep Links
function MapEffect({ selectedId, incidents }: { selectedId: string | null, incidents: Incident[] }) {
    const map = useMap();
    
    useEffect(() => {
        if (selectedId && incidents.length > 0) {
            const incident = incidents.find(i => i.id === selectedId);
            if (incident) {
                map.setView([incident.location.lat, incident.location.lng], 16, { animate: true });
            }
        }
    }, [selectedId, incidents, map]);

    return null;
}

function MapClickHandler({ active, onClick }: { active: boolean, onClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            if (active) {
                onClick(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
}

// Custom Zoom Controls
function ZoomControls() {
    const map = useMap();
    return (
        <div className="flex flex-col gap-2">
            <button 
                onClick={() => map.zoomIn()}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg hover:bg-slate-800"
            >
                <ZoomIn className="w-5 h-5" />
            </button>
            <button 
                onClick={() => map.zoomOut()}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg hover:bg-slate-800"
            >
                <ZoomOut className="w-5 h-5" />
            </button>
            <button 
                onClick={() => map.setView(COQUIMBO_CENTER, 14, { animate: true })}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-brand-primary transition-all shadow-lg hover:bg-slate-800"
                title="Recalibrar a Coquimbo"
            >
                <Target className="w-5 h-5" />
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
            // Local Dealership Search
            const localResults: SearchResult[] = dealerships
                .filter(d => d.name.toLowerCase().includes(val.toLowerCase()))
                .map(d => ({
                    display_name: d.name,
                    lat: d.latitude ?? d.location?.lat,
                    lon: d.longitude ?? d.location?.lng,
                    type: 'dealership',
                    id: d.id
                }));

            // Nominatim API Search (Address) - focused on the region
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' Coquimbo Chile')}&limit=5`);
            const data = await response.json();
            const apiResults: SearchResult[] = data.map((item: any) => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                type: 'address'
            }));

            // Combine and prioritize dealerships
            setResults([...localResults, ...apiResults]);
        } catch (error) {
            console.error("Search error:", error);
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
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md">
                <Search className="w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Buscar dirección o sede..."
                    className="bg-transparent border-none outline-none text-white text-xs flex-1 placeholder:text-slate-600"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {isSearching && <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />}
                {query && !isSearching && (
                    <button onClick={() => { setQuery(''); setResults([]); }}>
                        <X className="w-3 h-3 text-slate-500 hover:text-white" />
                    </button>
                )}
            </div>
            {results.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[2000] backdrop-blur-md">
                    {results.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => selectResult(r)}
                            className="w-full text-left p-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-none flex items-center gap-3 group"
                        >
                            {r.type === 'dealership' ? <Building2 className="w-4 h-4 text-brand-primary" /> : <MapPin className="w-4 h-4 text-slate-500" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white truncate group-hover:text-brand-primary transition-colors">{r.display_name}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{r.type === 'dealership' ? 'Sede de Red' : 'Ubicación'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const HEARTBEAT_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export default function MapView() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [dealerships, setDealerships] = useState<Dealership[]>([]);
    const [now, setNow] = useState(Date.now());
    const [showHeatmap, setShowHeatmap] = useState(true);
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
    const [reportImage, setReportImage] = useState<File | null>(null);
    const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);

    // Filters State
    const [filterTypes, setFilterTypes] = useState<string[]>(['ROBO', 'SOSPECHOSO', 'MARCAJE']);
    const [filterStatus, setFilterStatus] = useState<string[]>(['OPEN', 'RESOLVED']);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000); // Pulse every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Incident[];
            setIncidents(data);
        });

        const unsubDealerships = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Dealership[];
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
                updatedAt: serverTimestamp()
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
                id: crypto.randomUUID(),
                incidentId: incident.id,
                triggeredManually: true,
                triggeredBy: profile?.uid || 'unknown',
                createdAt: serverTimestamp(),
                notifiedDealershipIds: [] 
            });
            alert("Alerta de Red Disparada Exitosamente");
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
                lastSeen: new Date().toISOString()
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
        try {
            let imageUrl = '';
            if (reportImage) {
                const storageRef = ref(storage, `incidents/${crypto.randomUUID()}-${reportImage.name}`);
                const uploadResult = await uploadBytes(storageRef, reportImage);
                imageUrl = await getDownloadURL(uploadResult.ref);
            }

            const geohash = getGeohash(reportLocation[0], reportLocation[1]);
            const incidentId = crypto.randomUUID();
            
            const incidentData = {
                id: incidentId,
                type: reportType,
                description: reportDescription,
                reporterId: auth.currentUser.uid,
                dealershipId: profile?.dealershipId || 'MAP_UI',
                location: { lat: reportLocation[0], lng: reportLocation[1], geohash },
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

            setReportLocation(null);
            setReportType(null);
            setReportDescription('');
            setReportImage(null);
            setReportImagePreview(null);
        } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'incidents');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredIncidents = incidents.filter(incident => 
        filterTypes.includes(incident.type) && 
        filterStatus.includes(incident.status || 'OPEN')
    );

    const heatPoints: [number, number, number][] = filteredIncidents.map(incident => [
        incident.location.lat,
        incident.location.lng,
        1 
    ]);

    const toggleFilter = (list: string[], setList: (val: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    return (
        <div className="h-full w-full relative">
            <MapContainer 
                center={COQUIMBO_CENTER} 
                zoom={14} 
                className="h-full w-full"
                scrollWheelZoom={true}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapEffect selectedId={selectedIncidentId} incidents={incidents} />
                <MapClickHandler active={isReportingMode} onClick={handleMapClick} />
                
                {/* Internal UI components that need useMap() */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
                    <SearchBar dealerships={dealerships} />
                </div>

                <div className="absolute bottom-24 right-4 z-[1000]">
                    <ZoomControls />
                </div>

                {showHeatmap && <HeatmapLayer points={heatPoints} />}

                {showDealerships && dealerships.map(dealer => {
                    const lat = dealer.latitude ?? dealer.location?.lat;
                    const lng = dealer.longitude ?? dealer.location?.lng;
                    if (lat === undefined || lng === undefined) return null;
                    const position: [number, number] = [lat, lng];

                    // Combined Status & Heartbeat logic
                    let isHeartbeatOnline = false;
                    if (dealer.lastSeen) {
                        const lastSeenTime = new Date(dealer.lastSeen).getTime();
                        isHeartbeatOnline = (now - lastSeenTime) < HEARTBEAT_THRESHOLD_MS;
                    }
                    
                    // Manual status takes precedence if explicitly set to offline, otherwise use heartbeat or online status
                    const isOnline = dealer.status === 'online' || (dealer.status !== 'offline' && isHeartbeatOnline);

                    return (
                        <React.Fragment key={dealer.id}>
                            <Circle 
                                center={position} 
                                radius={250}
                                pathOptions={{ 
                                    color: isOnline ? '#3b82f6' : '#cbd5e1', 
                                    fillColor: isOnline ? '#3b82f6' : '#cbd5e1', 
                                    fillOpacity: 0.05, 
                                    weight: 1,
                                    dashArray: '4, 4'
                                }}
                            />
                            <Marker 
                                position={position}
                                icon={L.divIcon({
                                    className: 'custom-div-icon',
                                    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${isOnline ? 'bg-brand-primary' : 'bg-slate-400'}" style="color: white; padding: 6px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
                                    </div>`,
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 16]
                                })}
                            >
                                <Popup>
                                    <div className="p-4 w-64 bg-white rounded-2xl shadow-xl border-none">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isOnline ? 'bg-brand-primary shadow-blue-500/20' : 'bg-slate-400 shadow-slate-400/20'}`}>
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 leading-none mb-1.5 uppercase tracking-tight text-[11px] flex items-center gap-2">
                                                    {dealer.name}
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                                </h4>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {isOnline ? 'Sistema Online' : 'Desconectado'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-tight">Sede oficial integrante de la Red de Seguridad Automotriz AutoRed.</p>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Último Pulso</span>
                                                </div>
                                                <span className="text-[9px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    {dealer.lastSeen ? new Date(dealer.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                </span>
                                            </div>

                                            <button 
                                                className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                                            >
                                                Ver Detalles Red
                                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                            </button>

                                            {(['ADMIN', 'SECURITY'].includes(profile?.role || '') || profile?.dealershipId === dealer.id) && (
                                                <button 
                                                    onClick={() => handleUpdateDealerStatus(dealer.id, isOnline ? 'offline' : 'online')}
                                                    className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-sm ${isOnline ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-900/20'}`}
                                                >
                                                    <Zap className={`w-3.5 h-3.5 ${isOnline ? '' : 'animate-pulse'}`} />
                                                    {isOnline ? 'Simular Desconexión' : 'Activar Conector Red'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    );
                })}

                {showMarkers && incidents.filter(incident => 
                    (filterTypes.includes(incident.type) && filterStatus.includes(incident.status || 'OPEN')) || 
                    incident.id === selectedIncidentId
                ).map(incident => {
                    const isSelected = incident.id === selectedIncidentId;
                    const typeColor = incident.type === 'ROBO' ? '#ef4444' : incident.type === 'SOSPECHOSO' ? '#f97316' : '#2563eb';
                    
                    return (
                        <Marker 
                            key={incident.id} 
                            position={[incident.location.lat, incident.location.lng]}
                            icon={L.divIcon({
                                className: 'incident-icon',
                                html: `
                                    <div class="relative flex items-center justify-center">
                                        ${isSelected ? `<div class="absolute w-12 h-12 bg-white/20 rounded-full animate-ping"></div>` : ''}
                                        <div class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-all ${isSelected ? 'scale-125 z-[1001]' : ''}" style="background-color: ${typeColor}; color: white;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/></svg>
                                        </div>
                                    </div>
                                `,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                            })}
                            ref={(ref) => {
                                if (ref && isSelected) {
                                    ref.openPopup();
                                }
                            }}
                        >
                        <Popup>
                            <div className="p-2 w-64">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${incident.type === 'ROBO' ? 'bg-red-600' : incident.type === 'SOSPECHOSO' ? 'bg-orange-500' : 'bg-blue-600'} text-white shadow-sm`}>
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <h4 className="font-extrabold uppercase text-[11px] tracking-widest text-slate-900">{incident.type}</h4>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border-2 ${incident.status === 'RESOLVED' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : incident.status === 'FALSE_ALARM' ? 'border-slate-300 text-slate-500 bg-slate-50' : 'border-red-500 text-red-600 bg-red-50'}`}>
                                        {incident.status || 'OPEN'}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                                    {incident.imageUrl && (
                                        <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 shadow-sm group relative">
                                            <img 
                                                src={incident.imageUrl} 
                                                alt="Evidencia" 
                                                className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    )}
                                    <p className="text-sm font-semibold text-slate-800 leading-snug">{incident.description || 'Sin descripción adicional.'}</p>
                                    
                                    <div className="mt-4 pt-3 border-t border-slate-200/60">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Reportado por</p>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand-primary shadow-sm">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700 leading-tight">Red ID: {incident.reporterId?.slice(0, 8)}...</span>
                                                <span className="text-[9px] font-semibold text-slate-400">Sede: {incident.dealershipId}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2 text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <p className="text-[10px] font-bold font-mono">{new Date(incident.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    {(profile?.role === 'ADMIN' || profile?.role === 'SECURITY') && (
                                        <>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 pl-1">Acciones de Red</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleUpdateStatus(incident.id, 'RESOLVED')}
                                                    className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all active:scale-95 ${incident.status === 'RESOLVED' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'}`}
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-wider">RESUELTO</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(incident.id, 'FALSE_ALARM')}
                                                    className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all active:scale-95 ${incident.status === 'FALSE_ALARM' ? 'bg-slate-600 border-slate-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'}`}
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-wider">FALSA A.</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleShare(incident.id)}
                                                    className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all active:scale-95 ${copyingId === incident.id ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-primary hover:text-brand-primary'}`}
                                                >
                                                    <Share2 className="w-5 h-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-wider">{copyingId === incident.id ? 'COPIADO' : 'COMPARTIR'}</span>
                                                </button>
                                            </div>
                                            
                                            {incident.status === 'OPEN' && (
                                                <button 
                                                    onClick={() => handleTriggerAlert(incident)}
                                                    disabled={alertingId === incident.id}
                                                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-3 rounded-xl font-black text-[10px] tracking-widest shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {alertingId === incident.id ? (
                                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <Radio className="w-4 h-4 animate-pulse" />
                                                            DISPARAR ALERTA RED
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {incident.status !== 'OPEN' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(incident.id, 'OPEN')}
                                                    className="w-full py-2 text-[9px] font-bold text-slate-400 hover:text-red-500 transition-all text-center underline underline-offset-4"
                                                >
                                                    REAPERTURAR CASO
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {!(profile?.role === 'ADMIN' || profile?.role === 'SECURITY') && (
                                        <button 
                                            onClick={() => handleShare(incident.id)}
                                            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95 ${copyingId === incident.id ? 'bg-brand-primary border-brand-primary text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-primary hover:text-brand-primary'}`}
                                        >
                                            <Share2 className="w-5 h-5" />
                                            <span className="text-xs font-black uppercase tracking-wider">{copyingId === incident.id ? 'ENLACE COPIADO' : 'COMPARTIR INCIDENTE'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )})}
            </MapContainer>

            {/* Top Controls: Layers & Filters */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
                {/* Layer Toggles */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 ${showHeatmap ? 'bg-brand-primary text-white border-brand-primary' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Calor</span>
                    </button>
                    <button 
                        onClick={() => setShowMarkers(!showMarkers)}
                        className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 ${showMarkers ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                        <MapPin className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Puntos</span>
                    </button>
                    <button 
                        onClick={() => setIsReportingMode(!isReportingMode)}
                        className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 ${isReportingMode ? 'bg-red-600 text-white border-red-600 animate-pulse' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">{isReportingMode ? 'Cancel Report' : 'Reportar Aquí'}</span>
                    </button>
                    <button 
                        onClick={() => setShowDealerships(!showDealerships)}
                        className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 ${showDealerships ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Sedes</span>
                    </button>
                </div>

                {/* Filters Panel */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl w-64 space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Filtrar por Tipo</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'ROBO', label: 'Robo', color: 'border-red-500 text-red-500' },
                                { id: 'SOSPECHOSO', label: 'Sospechoso', color: 'border-orange-500 text-orange-500' },
                                { id: 'MARCAJE', label: 'Marcaje', color: 'border-blue-500 text-blue-500' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => toggleFilter(filterTypes, setFilterTypes, t.id)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${filterTypes.includes(t.id) ? t.color : 'border-slate-800 text-slate-600 bg-slate-800/20'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Estado del Reporte</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'OPEN', label: 'Abierto' },
                                { id: 'RESOLVED', label: 'Resuelto' },
                                { id: 'FALSE_ALARM', label: 'Falsa Alarma' }
                            ].map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => toggleFilter(filterStatus, setFilterStatus, s.id)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${filterStatus.includes(s.id) ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-600 border-slate-800 bg-slate-800/20'} border`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl z-[1000] w-64">
                <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-primary" />
                    Inteligencia Geográfica
                </h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500/40 border border-blue-500"></div>
                        <span className="text-xs text-slate-300 font-medium">Automotora Protegida</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Gradiente de Densidad</span>
                        <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 via-lime-500 to-red-500"></div>
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                            <span>BAJA</span>
                            <span>CRÍTICA</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 leading-tight">
                        Visualización de puntos calientes basada en reportes de las últimas 24 horas.
                    </p>
                </div>
            </div>

            {/* Reporting Modal Overlay */}
            <AnimatePresence>
                {reportLocation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl space-y-6"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-500/20 p-2 rounded-xl">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Nuevo Reporte Geográfico</h3>
                                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter">Lat: {reportLocation[0].toFixed(5)}, Lng: {reportLocation[1].toFixed(5)}</p>
                                    </div>
                                </div>
                                <button onClick={() => setReportLocation(null)} className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitReport} className="p-6 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Tipo de Incidente</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'ROBO', label: 'Robo', icon: ShieldAlert, color: 'bg-red-600' },
                                            { id: 'SOSPECHOSO', label: 'Sospechoso', icon: AlertTriangle, color: 'bg-orange-600' },
                                            { id: 'MARCAJE', label: 'Marcaje', icon: MapPin, color: 'bg-blue-600' },
                                            { id: 'OTRO', label: 'Otro', icon: Info, color: 'bg-slate-600' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setReportType(t.id as any)}
                                                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${reportType === t.id ? `border-white/50 ${t.color} text-white` : 'border-slate-800 bg-slate-800/50 text-slate-400'}`}
                                            >
                                                <t.icon className="w-5 h-5" />
                                                <span className="text-[11px] font-bold uppercase tracking-tight">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    placeholder="Descripción del suceso..."
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-brand-primary min-h-[100px]"
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                />

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input type="file" id="map-report-photo" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        <label
                                            htmlFor="map-report-photo"
                                            className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 cursor-pointer transition-all ${reportImagePreview ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-900/20' : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{reportImagePreview ? 'Foto Lista' : 'Añadir Foto'}</span>
                                        </label>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !reportType}
                                        className="flex-[2] bg-brand-primary hover:bg-opacity-90 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Emitir Alerta Red
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

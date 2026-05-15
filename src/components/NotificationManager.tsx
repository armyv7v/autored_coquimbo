import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Bell, X, MapPin } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface Incident {
  id: string;
  type: string;
  description: string;
  location: { lat: number; lng: number };
  createdAt: any;
  status?: string;
}

interface Dealership {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  status?: 'online' | 'offline';
  lastSeen?: string;
}

const HEARTBEAT_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// Haversine formula for distance calculation in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of earth
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function NotificationManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeAlert, setActiveAlert] = useState<Incident | null>(null);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const { permission } = usePushNotifications();

  useEffect(() => {
    // Fetch dealerships for proximity check
    const unsubDealers = onSnapshot(collection(db, 'dealerships'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Dealership[];
      setDealerships(data);
    });

    return () => unsubDealers();
  }, []);

  useEffect(() => {
    // We only care about VERY recent incidents added while the app is open
    // and ONLY if the user belongs to a dealership (as per requirement)
    if (!profile?.dealershipId) return;

    const q = query(
      collection(db, 'incidents'), 
      where('type', 'in', ['ROBO', 'SOSPECHOSO']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let isInitial = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial) {
        isInitial = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const incident = { id: change.doc.id, ...change.doc.data() } as Incident;
          
          // Logic: Is it near the user's specific dealership?
          const userDealer = dealerships.find(d => d.id === profile.dealershipId);
          
          if (userDealer) {
            // Check online status
            let isOnline = userDealer.status === 'online';
            if (userDealer.lastSeen) {
              const lastSeenTime = new Date(userDealer.lastSeen).getTime();
              // Use current time directly to avoid re-subscribing every minute
              isOnline = (Date.now() - lastSeenTime) < HEARTBEAT_THRESHOLD_MS;
            }

            if (!isOnline) {
              console.log(`Notification suppressed: Dealership ${userDealer.name} is offline.`);
              return;
            }

            const dist = getDistance(
              incident.location.lat, 
              incident.location.lng, 
              userDealer.location.lat, 
              userDealer.location.lng
            );

            if (dist < 10) { // 10km radius as requested
              triggerAlert(incident, userDealer.name);
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [dealerships, profile?.dealershipId]);

  const triggerAlert = async (incident: Incident, dealerName: string) => {
    setActiveAlert(incident);

    // Browser Notification (Generic)
    if (Notification.permission === "granted") {
      new Notification("🚨 ALERTA DE SEGURIDAD", {
        body: `${incident.type}: ${incident.description} cerca de ${dealerName}`,
        icon: "/vite.svg" 
      });
    }

    // FCM Multi-target Proximity Logic
    const nearbyOnlineDealers = dealerships.filter(dealer => {
      // Check online status
      let isOnline = dealer.status === 'online';
      if (dealer.lastSeen) {
        const lastSeenTime = new Date(dealer.lastSeen).getTime();
        isOnline = (Date.now() - lastSeenTime) < HEARTBEAT_THRESHOLD_MS;
      }
      
      if (!isOnline) return false;

      // Distance check
      const dist = getDistance(
        incident.location.lat,
        incident.location.lng,
        dealer.location.lat,
        dealer.location.lng
      );
      
      return dist <= 10;
    });

    // Send FCM push to each nearby online dealership
    for (const dealer of nearbyOnlineDealers) {
      try {
        console.log(`[FCM PUSH] Notificando a ${dealer.name} sobre ${incident.type}`);
        // We persist the notification to Firestore for the dealership to receive
        await addDoc(collection(db, 'push_notifications'), {
          recipientDealerId: dealer.id,
          title: `⚠️ ALERTA: ${incident.type}`,
          body: `${incident.description}`,
          incidentId: incident.id,
          type: 'INCIDENT_ALERT',
          createdAt: serverTimestamp(),
          sentVia: 'FCM_GATEWAY'
        });
      } catch (err) {
        console.error(`Error sending push to ${dealer.name}:`, err);
      }
    }

    // Auto-dismiss in-app toast
    setTimeout(() => setActiveAlert(null), 10000);
  };

  return (
    <AnimatePresence>
      {activeAlert && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[9999] w-full max-w-sm"
        >
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl shadow-2xl shadow-red-500/20 p-5 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
            
            <div className="flex items-start gap-4">
              <div className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-500/40">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-red-500 font-black text-xs uppercase tracking-[0.2em]">Prioridad Crítica</h3>
                  <button onClick={() => setActiveAlert(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <h4 className="text-white font-bold text-sm mb-1">{activeAlert.type} EN PROGRESO</h4>
                <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">
                  {activeAlert.description}
                </p>
                
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-xl border border-white/5 font-mono">
                  <MapPin className="w-3 h-3 text-brand-primary" />
                  <span className="text-[10px] text-slate-300">Cercano a Dealership Red</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => {
                navigate(`/map?incident=${activeAlert.id}`);
                setActiveAlert(null);
              }}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black py-3 rounded-xl transition-all uppercase tracking-widest border border-white/5 flex items-center justify-center gap-2"
            >
              <Bell className="w-3 h-3" /> Ver en Mapa
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

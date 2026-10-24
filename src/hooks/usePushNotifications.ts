import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Helper seguro para chequear si las notificaciones están soportadas por el navegador
const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export function usePushNotifications() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    isNotificationSupported() ? Notification.permission : 'denied'
  );

  useEffect(() => {
    const requestPermission = async () => {
      if (!isNotificationSupported()) {
        console.warn('Las notificaciones push no están soportadas en este navegador/dispositivo.');
        return;
      }

      try {
        const status = await Notification.requestPermission();
        setPermission(status);
        
        if (status === 'granted') {
          // A-05: la VAPID key llega por env en build time (VITE_FCM_VAPID_KEY).
          // Sin env configurado, el registro se omite silenciosamente y la app
          // sigue funcionando solo con los nodos en primer plano.
          const vapidKey = (import.meta as any).env?.VITE_FCM_VAPID_KEY || '';

          if (vapidKey && !vapidKey.includes('PLACEHOLDER')) {
            const currentToken = await getToken(messaging, { vapidKey });
            
            if (currentToken) {
              setToken(currentToken);
              // Save token to user profile
              if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userRef, {
                  fcmTokens: arrayUnion(currentToken)
                });
              }
            }
          } else {
            console.log('Push Notifications: Usando VAPID key de placeholder, se omite el registro en Firebase.');
          }
        }
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    };

    if (auth.currentUser) {
      requestPermission();
    }
  }, [auth.currentUser]);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    try {
      // Listen for foreground messages
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        if (payload.notification) {
          // El dispatcher envía data.incidentId: al tocar la notificación el
          // operador aterriza en el mapa con el incidente seleccionado, no en
          // una alerta muerta que solo se cierra.
          const incidentId = payload.data?.incidentId;
          const notification = new Notification(payload.notification.title || 'Nueva Alerta', {
            body: payload.notification.body,
            icon: '/favicon.ico',
            tag: incidentId ? `incident-${incidentId}` : undefined,
          });
          if (incidentId) {
            notification.onclick = () => {
              window.focus();
              navigate(`/map?incident=${incidentId}`);
              notification.close();
            };
          }
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('No se pudo suscribir al onMessage de Firebase Messaging:', err);
    }
  }, [navigate]);

  return { token, permission };
}

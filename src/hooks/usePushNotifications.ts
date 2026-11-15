import { useCallback, useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { arrayUnion, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { messaging, db, auth } from '../lib/firebase';
import { showForegroundNotification } from '../lib/notifications';

// Helper seguro para chequear si las notificaciones están soportadas por el navegador
const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

// N-S14: el hook se monta dos veces en '/' (Dashboard + NotificationManager);
// sin este guard habría doble getToken y dos notificaciones del sistema por
// cada push en foreground. El listener de foreground vive una vez por página.
let foregroundListenerBound = false;

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    isNotificationSupported() ? Notification.permission : 'denied'
  );

  // N-S6: el token se guarda en fcm_tokens/{uid} (colección aparte del perfil,
  // ver reglas N-R4) con setDoc merge — el updateDoc anterior fallaba en
  // silencio cuando el doc del usuario no existía y el token se perdía.
  const saveToken = useCallback(async (currentToken: string) => {
    setToken(currentToken);
    if (!auth.currentUser) return;
    try {
      await setDoc(
        doc(db, 'fcm_tokens', auth.currentUser.uid),
        { fcmTokens: arrayUnion(currentToken), updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('No se pudo guardar el token FCM:', err);
    }
  }, []);

  // Registro del token cuando el permiso YA está concedido: no requiere gesto.
  useEffect(() => {
    if (!isNotificationSupported() || !auth.currentUser) return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;
    (async () => {
      try {
        // A-05: la VAPID key llega por env en build time (VITE_FCM_VAPID_KEY).
        // Sin env configurado, el registro se omite silenciosamente y la app
        // sigue funcionando solo con los nodos en primer plano.
        const vapidKey = (import.meta as any).env?.VITE_FCM_VAPID_KEY || '';
        if (!vapidKey || vapidKey.includes('PLACEHOLDER')) return;

        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken && !cancelled) {
          await saveToken(currentToken);
        }
      } catch (err) {
        console.error('Error getting push token:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.currentUser, saveToken]);

  // N-S6: iOS PWA rechaza requestPermission sin gesto de usuario, así que el
  // permiso ya NO se pide al montar: el banner "Notificaciones en Espera"
  // llama a esta función desde su botón "Activar".
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) {
      console.warn('Las notificaciones push no están soportadas en este navegador/dispositivo.');
      return 'denied';
    }
    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const vapidKey = (import.meta as any).env?.VITE_FCM_VAPID_KEY || '';
        if (vapidKey && !vapidKey.includes('PLACEHOLDER')) {
          const currentToken = await getToken(messaging, { vapidKey });
          if (currentToken) {
            await saveToken(currentToken);
          }
        }
      }
      return status;
    } catch (error) {
      console.error('Error pidiendo permiso de notificaciones:', error);
      return Notification.permission;
    }
  }, [saveToken]);

  // Listener de foreground (singleton) + sincronización del estado de permiso
  // al volver a la pestaña (el usuario puede cambiarlo en ajustes del SO).
  useEffect(() => {
    if (!isNotificationSupported()) return;

    const syncPermission = () => setPermission(Notification.permission);
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);

    if (!foregroundListenerBound) {
      foregroundListenerBound = true;
      try {
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          if (!payload.notification) return;
          // El dispatcher envía data.incidentId: al tocar la notificación el
          // operador aterriza en el mapa con el incidente seleccionado. El
          // deep link lo resuelve el notificationclick del SW.
          const incidentId = payload.data?.incidentId;
          showForegroundNotification(payload.notification.title || 'Nueva Alerta', {
            body: payload.notification.body,
            icon: '/favicon.ico',
            tag: incidentId ? `incident-${incidentId}` : undefined,
            data: incidentId ? { url: `/map?incident=${incidentId}` } : { url: '/' },
          });
        });
      } catch (err) {
        console.warn('No se pudo suscribir al onMessage de Firebase Messaging:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  return { token, permission, requestPermission };
}

import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Helper seguro para chequear si las notificaciones están soportadas por el navegador
const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export function usePushNotifications() {
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
          // Get FCM Token
          // Note: You need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
          const vapidKey = 'BD8X8W9R8-H-PLACEHOLDER-VAPID-KEY-NEED-REAL-ONE-FROM-CONSOLE';
          
          // Solo intentamos registrar si el VAPID Key no es el de mentira/placeholder
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
          new Notification(payload.notification.title || 'Nueva Alerta', {
            body: payload.notification.body,
            icon: '/vite.svg'
          });
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('No se pudo suscribir al onMessage de Firebase Messaging:', err);
    }
  }, []);

  return { token, permission };
}

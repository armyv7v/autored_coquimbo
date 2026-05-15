import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const status = await Notification.requestPermission();
        setPermission(status);
        
        if (status === 'granted') {
          // Get FCM Token
          // Note: You need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
          const currentToken = await getToken(messaging, {
            vapidKey: 'BD8X8W9R8-H-PLACEHOLDER-VAPID-KEY-NEED-REAL-ONE-FROM-CONSOLE'
          });
          
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
  }, []);

  return { token, permission };
}

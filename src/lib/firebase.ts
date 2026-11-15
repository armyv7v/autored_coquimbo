import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Perf: messaging y storage salen del bundle inicial vía dynamic import.
// Ninguno se necesita al boot: messaging solo tras conceder permiso (N-S6)
// y storage solo al subir una foto. Con esto el chunk estático de firebase
// (app+auth+firestore) baja de ~553 kB y el warning de 500 kB desaparece.
import type { Messaging } from 'firebase/messaging';
import type { FirebaseStorage } from 'firebase/storage';

let messagingPromise: Promise<Messaging> | null = null;
export function getFirebaseMessaging(): Promise<Messaging> {
  if (!messagingPromise) {
    messagingPromise = import('firebase/messaging').then(({ getMessaging }) => getMessaging(app));
  }
  return messagingPromise;
}

let storagePromise: Promise<FirebaseStorage> | null = null;
export function getFirebaseStorage(): Promise<FirebaseStorage> {
  if (!storagePromise) {
    storagePromise = import('firebase/storage').then(({ getStorage }) => getStorage(app));
  }
  return storagePromise;
}

// Test connection to Firestore
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

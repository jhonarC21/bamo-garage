import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: Firestore;

try {
  // Configura Firestore con persistencia local y experimentalForceLongPolling para evitar fallos de WebSockets en iframes
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch (error: unknown) {
  // Fallback si ya fue inicializado previamente o en entornos con restricciones de almacenamiento
  console.warn('[Firebase] initializeFirestore fallback to getFirestore:', error);
  try {
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Validador de conexión según la especificación de integración Firebase
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase backend connection check: client operating in offline cache mode.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export default app;


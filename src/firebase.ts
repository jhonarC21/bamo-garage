import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)' &&
  firebaseConfig.firestoreDatabaseId !== ''
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

// Primary configured Firestore database with long polling fallback
let primaryDb: Firestore;
try {
  primaryDb = dbId
    ? initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true,
        },
        dbId
      )
    : initializeFirestore(app, {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
} catch {
  primaryDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

// Default (fallback) Firestore database if dbId is custom
let defaultDbInstance: Firestore | null = null;
if (dbId) {
  try {
    defaultDbInstance = getFirestore(app);
  } catch {
    defaultDbInstance = null;
  }
}

export const db = primaryDb;
export const defaultDb = defaultDbInstance;
export const allDbs: Firestore[] = defaultDbInstance ? [primaryDb, defaultDbInstance] : [primaryDb];

/**
 * Helper to write a document across all Firestore databases in parallel
 */
export async function writeDocumentToAllDatabases(
  collectionName: string,
  docId: string,
  data: any,
  merge: boolean = true
) {
  const promises = allDbs.map((targetDb) =>
    setDoc(doc(targetDb, collectionName, docId), data, { merge })
  );
  return Promise.allSettled(promises);
}

/**
 * Helper to delete a document across all Firestore databases in parallel
 */
export async function deleteDocumentFromAllDatabases(
  collectionName: string,
  docId: string
) {
  const promises = allDbs.map((targetDb) =>
    deleteDoc(doc(targetDb, collectionName, docId))
  );
  return Promise.allSettled(promises);
}

export default app;

import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let firebaseApp: FirebaseApp | undefined;
let firebaseDb: ReturnType<typeof getFirestore> | undefined;

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(', ')}`);
  }

  return config as Record<keyof typeof config, string>;
}

export function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  firebaseApp = getApps()[0] ?? initializeApp(getFirebaseConfig());
  return firebaseApp;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getGoogleProvider() {
  return new GoogleAuthProvider();
}

export function getFirebaseDb() {
  if (firebaseDb) return firebaseDb;

  const app = getFirebaseApp();
  try {
    firebaseDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Firestore may already have been initialized by another module instance.
    firebaseDb = getFirestore(app);
  }
  return firebaseDb;
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

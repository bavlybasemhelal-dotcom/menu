import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
const e = import.meta.env;
export const emulator = e.VITE_USE_EMULATORS === "true";
if (
  emulator &&
  (!import.meta.env.DEV || e.VITE_FIREBASE_PROJECT_ID !== "demo-souqna")
)
  throw Error("Emulators are development-only");
export const firebaseConfigured = !!(
  e.VITE_FIREBASE_API_KEY &&
  e.VITE_FIREBASE_APP_ID &&
  e.VITE_FIREBASE_PROJECT_ID
);
const app = firebaseConfigured
  ? initializeApp({
      apiKey: e.VITE_FIREBASE_API_KEY,
      projectId: e.VITE_FIREBASE_PROJECT_ID,
      appId: e.VITE_FIREBASE_APP_ID,
      authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
      messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
    })
  : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const shopId = e.VITE_SHOP_ID || "main";
if (emulator && auth && db) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

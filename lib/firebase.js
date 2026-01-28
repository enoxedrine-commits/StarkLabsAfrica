import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
if (typeof window !== "undefined") {
  const missingVars = [];
  if (!firebaseConfig.apiKey) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain) missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.storageBucket) missingVars.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!firebaseConfig.messagingSenderId) missingVars.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  if (!firebaseConfig.appId) missingVars.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  
  if (missingVars.length > 0) {
    console.error("❌ Firebase Configuration Error: Missing environment variables:", missingVars);
    console.error("💡 Make sure your .env.local file exists and contains all NEXT_PUBLIC_FIREBASE_* variables");
    console.error("💡 Restart your dev server after updating .env.local");
  } else if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your_firebase_api_key_here") {
    console.error("❌ Firebase API Key Error: Invalid or placeholder API key");
    console.error("💡 Please update NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file with a valid Firebase API key");
  }
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Initialize messaging only on the client side (browser)
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export { app, db, storage, auth, messaging };

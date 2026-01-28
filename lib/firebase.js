import { initializeApp, getApps } from "firebase/app";
import { getFirestore, setLogLevel } from "firebase/firestore";
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

// Reduce Firestore log verbosity - suppress expected offline mode warnings
if (typeof window !== "undefined") {
  try {
    // Set log level to 'error' to reduce verbosity
    // Note: This may not suppress all offline warnings as they're logged at error level
    setLogLevel('error');
  } catch (e) {
    // setLogLevel might not be available in all Firebase versions - that's okay
  }
  
  // Intercept console.error to filter out expected Firestore offline warnings
  // These are normal when the app operates offline and shouldn't be shown as errors
  const originalError = console.error;
  const firestoreOfflinePatterns = [
    'Could not reach Cloud Firestore backend',
    'Connection failed',
    'operate in offline mode',
    '@firebase/firestore',
    'unavailable'
  ];
  
  console.error = function(...args) {
    // Convert all args to string for pattern matching
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg?.message) return arg.message;
      if (arg?.toString) return arg.toString();
      return String(arg);
    }).join(' ');
    
    // Only filter Firestore offline warnings - be very specific
    const isFirestoreOfflineWarning = 
      message.includes('@firebase/firestore') &&
      (
        message.includes('Could not reach Cloud Firestore backend') ||
        message.includes('Connection failed') ||
        message.includes('operate in offline mode') ||
        (message.includes('unavailable') && message.includes('Firestore'))
      );
    
    if (isFirestoreOfflineWarning) {
      // Log as debug instead of error since this is expected behavior when offline
      console.debug('📡 Firestore operating in offline mode (expected when connection unavailable)');
      return;
    }
    
    // Pass through all other errors
    originalError.apply(console, args);
  };
}

const storage = getStorage(app);
const auth = getAuth(app);

// Initialize messaging only on the client side and when supported
// Wrap in try-catch to handle unsupported browsers gracefully
let messaging = null;

if (typeof window !== "undefined") {
  try {
    // Check for basic requirements before initializing
    const hasServiceWorker = "serviceWorker" in navigator;
    const isSecureContext = window.isSecureContext === true || 
                           window.location.protocol === "https:" || 
                           window.location.hostname === "localhost" ||
                           window.location.hostname === "127.0.0.1";
    
    if (hasServiceWorker && isSecureContext) {
      messaging = getMessaging(app);
    } else {
      if (!hasServiceWorker) {
        console.warn("⚠️  Firebase Messaging: Service Workers not supported in this browser");
      }
      if (!isSecureContext) {
        console.warn("⚠️  Firebase Messaging: Requires HTTPS or localhost (current protocol: " + window.location.protocol + ")");
      }
    }
  } catch (error) {
    // Silently handle unsupported browser errors
    console.warn("⚠️  Firebase Messaging not available:", error.message);
    messaging = null;
  }
}

export { app, db, storage, auth, messaging };



// lib/NotificationManager.js
import { messaging, db } from "@/lib/firebase";
import { getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";

// Get VAPID key from environment variable
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || "";

// Validate VAPID key
if (typeof window !== "undefined" && !VAPID_KEY) {
  console.warn("⚠️  VAPID key not configured. Push notifications will not work.");
  console.warn("💡 Add NEXT_PUBLIC_VAPID_KEY to your .env.local file");
  console.warn("💡 Get it from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates");
}

export async function listenForForegroundMessages(callback) {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (!(await isSupported())) return;

  try {
    onMessage(messaging, async (payload) => {
      console.log("🔔 Foreground message received:", payload);

      const { title, body } = payload?.notification || {};
      const data = payload?.data || {};

      try {
        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
          || (await navigator.serviceWorker.ready);
        if (registration && title) {
          await registration.showNotification(title, {
            body: body || "",
            icon: "/Slogo.png",
            data,
          });
        } else if (Notification.permission === "granted" && title) {
          new Notification(title, { body: body || "" });
        }
      } catch (e) {
        if (Notification.permission === "granted" && title) {
          new Notification(title, { body: body || "" });
        }
      }

      if (callback) callback(payload);
    });
  } catch (error) {
    console.warn("Failed to set up foreground message listener:", error);
  }
}

export async function requestPermissionAndToken(user) {
  if (typeof window === "undefined") return null;
  if (!user?.uid) return null;
  if (!(await isSupported())) return null;
  
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported in this browser.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission not granted.");
      return null;
    }

    let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("Service worker registered:", registration);
    }
    await navigator.serviceWorker.ready;

    // Check if VAPID key is configured
    console.log("🔍 Debugging VAPID key:", {
      hasVapidKey: !!VAPID_KEY,
      vapidKeyLength: VAPID_KEY?.length || 0,
      vapidKeyPreview: VAPID_KEY ? `${VAPID_KEY.substring(0, 20)}...` : "missing",
      envVar: process.env.NEXT_PUBLIC_VAPID_KEY ? "found" : "not found"
    });

    if (!VAPID_KEY || VAPID_KEY === "your_vapid_key_here" || VAPID_KEY === "") {
      console.error("❌ VAPID key not configured. Cannot get FCM token.");
      console.error("💡 Get your VAPID key from Firebase Console:");
      console.error("   Project Settings → Cloud Messaging → Web Push certificates");
      console.error("   Then add it to .env.local as NEXT_PUBLIC_VAPID_KEY");
      console.error("   Make sure to restart your dev server after updating .env.local");
      return null;
    }

    // Validate VAPID key format (should be around 87 characters, but can vary)
    if (VAPID_KEY.length < 40) {
      console.warn("⚠️  VAPID key seems too short. Typical VAPID keys are 80+ characters.");
      console.warn("   Current length:", VAPID_KEY.length);
      console.warn("   Please verify the key in Firebase Console → Cloud Messaging → Web Push certificates");
    }

    try {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log("✅ FCM Token:", token);
        await setDoc(doc(db, "users", user.uid), { fcmToken: token }, { merge: true });
        return token;
      } else {
        console.warn("No registration token available.");
        return null;
      }
    } catch (tokenError) {
      console.error("❌ Error getting FCM token:", tokenError);
      
      // Provide specific error guidance
      if (tokenError.message?.includes("authentication credential")) {
        console.error("💡 This error usually means:");
        console.error("   1. VAPID key is incorrect or doesn't match your Firebase project");
        console.error("   2. VAPID key format is wrong (check for extra spaces/quotes)");
        console.error("   3. Dev server wasn't restarted after updating .env.local");
        console.error("\n   Steps to fix:");
        console.error("   1. Go to Firebase Console → Project Settings → Cloud Messaging");
        console.error("   2. Copy the FULL Web Push certificate key pair");
        console.error("   3. Update NEXT_PUBLIC_VAPID_KEY in .env.local");
        console.error("   4. Restart dev server: npm run dev");
      }
      
      return null;
    }
  } catch (err) {
    console.error("Error in requestPermissionAndToken:", err);
    return null;
  }
}






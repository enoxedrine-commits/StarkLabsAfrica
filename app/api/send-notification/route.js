

// import { NextResponse } from "next/server";
// import admin from "firebase-admin";
// import { readFileSync } from "fs";
// import path from "path";

// // Prevent re-initialization
// if (!admin.apps.length) {
//   const serviceAccountPath = path.join(process.cwd(), "@/server/firebase/serviceAccountKey.json");
//   const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export async function POST(req) {
//   try {
//     const { fcmToken, title, body } = await req.json();

//     const message = {
//       token: fcmToken,
//       notification: {
//         title,
//         body,
//       },
//       webpush: {
//         notification: {
//           icon: "/icon.png", // Optional
//         },
//       },
//     };

//     const response = await admin.messaging().send(message);

//     return NextResponse.json({ success: true, response });
//   } catch (error) {
//     console.error("FCM Error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }




// // app/api/send-notification/route.js
// import admin from "firebase-admin";
// import { readFileSync } from "fs";
// import path from "path";

// if (!admin.apps.length) {
//   const serviceAccountPath = path.join(
//     process.cwd(),
//     "server/firebase/helloquip-80e20-firebase-adminsdk-fbsvc-9c445489ba.json"
//   );

//   const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export async function POST(req) {
//   try {
//     const { fcmToken, title, body } = await req.json();

//     const message = {
//       token: fcmToken,
//       notification: {
//         title,
//         body,
//       },
//       webpush: {
//         notification: {
//           icon: "/icon.png",
//         },
//       },
//     };

//     const response = await admin.messaging().send(message);

//     return new Response(
//       JSON.stringify({ success: true, response }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error sending notification:", error);
//     return new Response(
//       JSON.stringify({ success: false, error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }





// app/api/send-notification/route.js
import admin from "firebase-admin";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { getFirestore } from "firebase-admin/firestore";

let initErrorMessage = null;

if (!admin.apps.length) {
  try {
    let serviceAccount = null;

    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (inline) {
      serviceAccount = JSON.parse(inline);
    } else if (filePath) {
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);
      const content = readFileSync(resolved, "utf-8");
      serviceAccount = JSON.parse(content);
    } else {
      const defaultDir = path.join(process.cwd(), "server/firebase");
      if (existsSync(defaultDir)) {
        const jsonFiles = readdirSync(defaultDir).filter((f) => f.endsWith(".json"));
        if (jsonFiles.length > 0) {
          const candidate = path.join(defaultDir, jsonFiles[0]);
          const content = readFileSync(candidate, "utf-8");
          serviceAccount = JSON.parse(content);
        } else {
          initErrorMessage = "Missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH (no JSON found in server/firebase)";
        }
      } else {
        initErrorMessage = "Missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH (server/firebase not found)";
      }
    }

    if (serviceAccount) {
      // Fix "Invalid PEM formatted message": env vars often store private_key with
      // literal \n (backslash+n). PEM requires real newlines.
      if (serviceAccount.private_key && typeof serviceAccount.private_key === "string") {
        serviceAccount = {
          ...serviceAccount,
          private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
        };
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (e) {
    initErrorMessage = `Failed to initialize Firebase Admin: ${e.message}`;
  }
}

export async function POST(req) {
  try {
    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized:", initErrorMessage);
      return new Response(
        JSON.stringify({ success: false, error: initErrorMessage || "Firebase Admin not initialized" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { fcmToken, title, body, target, link, data: extraData, userId, notificationType = "fcm" } = await req.json();

    console.log("📱 FCM Request:", { 
      hasToken: !!fcmToken, 
      tokenLength: fcmToken?.length,
      title, 
      body,
      target,
      link,
      userId,
      notificationType
    });

    if (!fcmToken) {
      console.error("❌ Missing FCM token");
      return new Response(
        JSON.stringify({ success: false, error: "Missing fcmToken" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate FCM token format
    if (typeof fcmToken !== 'string' || fcmToken.length < 100) {
      console.error("❌ Invalid FCM token format:", { length: fcmToken?.length, type: typeof fcmToken });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid FCM token format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const isAdminManual = !!(extraData && extraData.source === 'adminManual');
    const hostedBase = process.env.PUBLIC_BASE_URL || 'https://localhost:3000';

    let resolvedLink = null;
    try {
      if (isAdminManual) {
        // Respect provided link or origin for admin manual notifications
        const headers = req.headers;
        const origin = headers.get?.("origin") || process.env.PUBLIC_BASE_URL || hostedBase;
        const base = origin || hostedBase;
        if (link) {
          resolvedLink = link;
        } else if (target) {
          resolvedLink = new URL(target, base).toString();
        } else {
          resolvedLink = base;
        }
      } else {
        // Force links to use the production domain for all other FCMs
        const base = hostedBase;
        resolvedLink = new URL(target || '/', base).toString();
      }
    } catch (e) {
      console.warn("⚠️ Link resolution failed:", e.message);
    }

    const dataPayload = { ...(extraData || {}) };
    if (target) {
      dataPayload.target = target; // relative path (preferred for in-app navigation)
      dataPayload.relativeLink = target;
    }
    if (resolvedLink) dataPayload.link = resolvedLink; // absolute URL for webpush link

    const message = {
      token: fcmToken,
      notification: { title: title || "", body: body || "" },
      webpush: {
        notification: { icon: "/logo.png" },
        fcmOptions: resolvedLink ? { link: resolvedLink } : undefined,
      },
      data: dataPayload,
    };

    console.log("📤 Sending FCM message:", {
      token: fcmToken.substring(0, 20) + "...",
      title: message.notification.title,
      body: message.notification.body,
      hasLink: !!resolvedLink
    });

    const response = await admin.messaging().send(message);

    console.log("✅ FCM sent successfully:", response);

    // Now add the FCM message ID and user ID to the data payload for tracking
    dataPayload.fcmMessageId = response;
    dataPayload.userId = userId;

    // Save notification to Firestore for tracking
    if (userId) {
      try {
        const db = getFirestore();
        const notificationData = {
          userId,
          title: title || "",
          body: body || "",
          target: target || "",
          link: resolvedLink || "",
          type: notificationType,
          fcmToken: fcmToken.substring(0, 20) + "...", // Store partial token for reference
          fcmMessageId: response, // FCM message ID for tracking
          status: "sent",
          read: false,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          readAt: null,
          data: dataPayload,
          source: extraData?.source || "system"
        };

        await db.collection("notifications").add(notificationData);
        console.log("📝 Notification saved to Firestore for tracking");
      } catch (trackingError) {
        console.warn("⚠️ Failed to save notification for tracking:", trackingError.message);
      }
    }

    return new Response(
      JSON.stringify({ success: true, response }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ FCM Error Details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      errorType: error.constructor.name
    });
    
    // Handle specific FCM error codes
    let errorMessage = error.message;
    if (error.code === 'messaging/invalid-registration-token') {
      errorMessage = "Invalid FCM token - user may need to refresh";
    } else if (error.code === 'messaging/registration-token-not-registered') {
      errorMessage = "FCM token not registered - user device not found";
    } else if (error.code === 'messaging/quota-exceeded') {
      errorMessage = "FCM quota exceeded";
    } else if (error.code === 'messaging/unauthorized') {
      errorMessage = "FCM unauthorized - check service account permissions";
    }
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, code: error.code }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

# Setup Checklist - Configuration Changes Required

After forking this project, you need to update the following configurations before customizing:

## 🔥 1. Firebase Configuration

### ✅ Now Using Environment Variables!

The project has been updated to use environment variables for all Firebase configuration. No more hardcoded values!

### Step 1: Create `.env.local` file

Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

### Step 2: Add Firebase Configuration to `.env.local`

Add your Firebase project credentials to `.env.local`:

```env
# Firebase Configuration (Client-Side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**How to get Firebase credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or select existing)
3. Go to Project Settings → General
4. Scroll to "Your apps" → Web app → Copy the config values
5. Add them to your `.env.local` file

### Step 3: Update `.firebaserc`

Update the Firebase project ID in `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

### Step 4: Service Worker Configuration

The service worker (`public/firebase-messaging-sw.js`) is automatically configured at build time using the environment variables. The build script (`scripts/inject-firebase-config.js`) will inject your Firebase config into the service worker before building.

**Note:** The service worker template is in `public/firebase-messaging-sw.template.js`. The build process automatically generates `firebase-messaging-sw.js` from the template using your environment variables.

---

## 🤖 2. Google Gemini API Key

### Environment Variable Required:

Create a `.env.local` file in the root directory (if it doesn't exist):
```env
GOOGLE_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_VAPID_KEY=your_vapid_key_here
```

**Used in:** `app/api/agent-chat/route.js` (line 207) - The ChatGoogleGenerativeAI initialization reads this from `process.env.GOOGLE_API_KEY`

**How to get Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to `.env.local`

**Note:** The `.env.local` file is already in `.gitignore`, so it won't be committed to git.

---

## 📱 2b. Firebase Cloud Messaging VAPID Key (Optional)

### Environment Variable:

Add to `.env.local`:
```env
NEXT_PUBLIC_VAPID_KEY=your_vapid_key_here
```

**Used in:** `lib/NotificationManager.js` - For push notifications

**How to get VAPID Key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`starklabsafrica`)
3. Go to Project Settings → Cloud Messaging tab
4. Scroll to "Web Push certificates"
5. If no key exists, click "Generate key pair"
6. Copy the Key pair value
7. Add it to `.env.local` as `NEXT_PUBLIC_VAPID_KEY`

**Note:** If you don't set this, push notifications will be disabled but the app will work fine.

---

## 🔐 3. NextAuth Secret

### Environment Variable Required:

Add to `.env.local`:
```env
NEXTAUTH_SECRET=your_random_secret_key_here
```

**Used in:** `app/api/auth/[...nextauth]/route.js` (line 42)

**How to generate:**
- Use any random string generator (at least 32 characters)
- Or run: `openssl rand -base64 32` in terminal
- Or use an online generator

---

## 🔧 4. Firebase Service Account (Server-Side)

### Option A: Environment Variable (Recommended for Production)
Add to `.env.local`:
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Note:** If using environment variable, make sure to escape newlines in `private_key` as `\\n`

### Option B: Service Account JSON File
1. Download your Firebase service account JSON file:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file

2. Place it in `server/firebase/` directory (create the folder if needed)

3. Or set environment variable:
```env
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/your/serviceAccountKey.json
```

**Used in:** `app/api/send-notification/route.js` (lines 113-138) - For sending push notifications server-side

**Note:** The service account file is already in `.gitignore` (line 45-46)

---

## 🌐 5. Domain/URL References

### Files to Update:

#### a) `public/firebase-messaging-sw.js` (Line 79)
Update the allowed hostname for notification clicks:
```javascript
url.hostname.endsWith("your-domain.vercel.app");
```

#### b) `app/api/send-notification/route.js` (Line 199)
Update the hosted base URL:
```javascript
const hostedBase = 'https://your-domain.vercel.app';
```

#### c) `app/api/send-notification/route.js` (Line 206)
Optional: Set environment variable:
```env
PUBLIC_BASE_URL=https://your-domain.vercel.app
```

---

## 📧 6. Admin Email Addresses

### File to Update:

#### `app/utils/withAdminAuth.js` (Line 9)
Update the admin email list:
```javascript
const ADMIN_EMAILS = [
  "your-admin-email@example.com",
  "another-admin@example.com"
];
```

---

## 🏷️ 7. Project Name & Branding

### Files to Update (Optional but Recommended):

#### a) `package.json` (Line 2)
```json
"name": "your-project-name",
```

#### b) `app/layout.js` (Lines 6, 15, 43, 46)
Update metadata:
```javascript
title: "Your App Name",
// ... and other meta tags
```

#### c) `components/AgentChat.js` (Line 17)
Update the chat greeting:
```javascript
"Hi! I'm the YourAppName support assistant..."
```

#### d) `components/InstallPrompt.js` (Line 73)
Update PWA install prompt:
```javascript
<div>Install YourAppName</div>
```

#### e) `components/ConvertToQuotationButton.js` (Lines 134, 183)
Update company website and support email:
```javascript
doc.text("www.yourdomain.com", 14, 28);
// ...
"Payment due within 30 days. Please contact support@yourdomain.com for questions."
```

#### f) `components/CachedLogo.js` (Lines 19-22)
Update logo URLs to point to your Firebase Storage:
```javascript
default: "https://firebasestorage.googleapis.com/v0/b/YOUR_PROJECT_ID.firebasestorage.app/o/YOUR_LOGO.png?alt=media&token=YOUR_TOKEN",
```

---

## 📋 Quick Setup Summary

1. **Copy `.env.example` to `.env.local`**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in Firebase credentials** in `.env.local`:
   - Get values from Firebase Console → Project Settings → General → Your apps → Web app
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables

3. **Update `.firebaserc`**:
   - Replace `YOUR_FIREBASE_PROJECT_ID` with your actual project ID

4. **Add other required environment variables**:
   - `GOOGLE_API_KEY` (for AI chat)
   - `NEXTAUTH_SECRET` (generate a random string)
   - `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH` (for server-side operations)

5. **Optional environment variables**:
   - `PUBLIC_BASE_URL` (for notifications and links)
   - `NEXT_PUBLIC_VAPID_KEY` (for push notifications)
   - Logo URLs (after uploading logos to Firebase Storage)

6. **Update admin emails** in:
   - `app/utils/withAdminAuth.js`

7. **Optional branding updates**:
   - `package.json`
   - `app/layout.js`
   - Various component files

---

## ✅ Verification Steps

After making changes:

1. **Run the Firebase config injection script** (automatically runs on build, but you can test it):
   ```bash
   npm run inject-firebase
   ```
   This will inject your environment variables into the service worker.

2. **Test Firebase connection:**
   ```bash
   npm run dev
   # Visit http://localhost:3000 and check browser console for Firebase errors
   ```

3. **Verify environment variables are loaded:**
   - Check browser console - Firebase should initialize without errors
   - Check Network tab - Firebase API calls should succeed

4. **Test Gemini API:**
   - Visit `/agent-chat` page
   - Send a test message
   - Check server logs for API errors

5. **Test Firebase Admin (if using notifications):**
   - Check that service account is properly loaded
   - Test sending a notification from admin panel

6. **Deploy to Firebase:**
   ```bash
   firebase deploy
   ```

7. **For production deployment:**
   - Make sure to add all environment variables to your hosting platform (Vercel, etc.)
   - The build script will automatically inject Firebase config during build

---

## 🔒 Security Notes

- ✅ `.env.local` is already in `.gitignore` - your secrets won't be committed
- ✅ Service account JSON files are in `.gitignore`
- ⚠️ Never commit API keys or secrets to git
- ⚠️ For production, use environment variables in your hosting platform (Vercel, etc.)

---

## 📚 Additional Resources

- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [Google Gemini API](https://ai.google.dev/)
- [NextAuth Documentation](https://next-auth.js.org/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

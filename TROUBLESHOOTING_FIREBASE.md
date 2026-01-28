# Firebase API Key Error Troubleshooting

## Error: `auth/api-key-not-valid.-please-pass-a-valid-api-key.`

This error means Firebase cannot authenticate with the provided API key. Here's how to fix it:

## ✅ Step 1: Verify Your API Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`starklabsafrica`)
3. Go to **Project Settings** (gear icon) → **General** tab
4. Scroll down to **Your apps** section
5. Click on your **Web app** (or create one if it doesn't exist)
6. Copy the **API Key** from the config object

## ✅ Step 2: Check Your `.env.local` File

Make sure your `.env.local` file:
- ✅ Exists in the project root directory
- ✅ Has no extra spaces or quotes around values
- ✅ Uses the correct variable name: `NEXT_PUBLIC_FIREBASE_API_KEY`
- ✅ Contains the actual API key (not placeholder text)

**Correct format:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCsEP8dyJqNY8GL7zLbd72HYumCjKXWaVw
```

**Incorrect formats:**
```env
# ❌ With quotes
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyCsEP8dyJqNY8GL7zLbd72HYumCjKXWaVw"

# ❌ With spaces
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyCsEP8dyJqNY8GL7zLbd72HYumCjKXWaVw

# ❌ Placeholder text
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
```

## ✅ Step 3: Restart Your Dev Server

**Important:** Next.js only loads environment variables when the server starts.

1. Stop your dev server (Ctrl+C)
2. Start it again:
   ```bash
   npm run dev
   ```

Environment variables are loaded at startup, so changes to `.env.local` won't take effect until you restart.

## ✅ Step 4: Verify All Firebase Variables

Make sure ALL these variables are set in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=starklabsafrica.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=starklabsafrica
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=starklabsafrica.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## ✅ Step 5: Check Browser Console

Open your browser's developer console (F12) and check for:
- Error messages about missing environment variables
- Firebase initialization errors
- Any warnings about invalid configuration

## ✅ Step 6: Verify API Key Restrictions

If your API key has restrictions:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your API key
4. Check **API restrictions**:
   - Should include: **Firebase Authentication API**, **Cloud Firestore API**, **Cloud Storage API**
5. Check **Application restrictions**:
   - If set to HTTP referrers, make sure your domain is included
   - For development: `localhost:3000` should be allowed

## ✅ Step 7: Regenerate API Key (If Needed)

If the API key is still not working:

1. Go to Firebase Console → Project Settings → General
2. Scroll to **Your apps** → Web app
3. Click the **Settings** icon (gear) next to your app
4. Click **Regenerate key** (if available)
5. Copy the new API key
6. Update `.env.local` with the new key
7. Restart your dev server

## ✅ Step 8: Check Service Worker (If Using PWA)

If you're using the service worker for push notifications:

1. Run the injection script:
   ```bash
   npm run inject-firebase
   ```
2. Check `public/firebase-messaging-sw.js` to ensure it has the correct API key
3. Clear browser cache and reload

## Common Issues

### Issue: Environment variables not loading
**Solution:** 
- Make sure `.env.local` is in the project root (same level as `package.json`)
- Restart the dev server after changing `.env.local`
- Check that variable names start with `NEXT_PUBLIC_` for client-side variables

### Issue: API key works in Firebase Console but not in app
**Solution:**
- Check API key restrictions in Google Cloud Console
- Make sure `localhost:3000` is allowed for development
- Verify the API key matches the one in Firebase Console

### Issue: Different API key for different environments
**Solution:**
- Use `.env.local` for local development
- Set environment variables in your hosting platform (Vercel, etc.) for production
- Don't commit `.env.local` to git (it's already in `.gitignore`)

## Still Having Issues?

1. Double-check your API key in Firebase Console
2. Verify all environment variables are set correctly
3. Restart your dev server
4. Clear browser cache
5. Check browser console for detailed error messages

If the problem persists, the API key might be invalid or restricted. Try regenerating it from Firebase Console.

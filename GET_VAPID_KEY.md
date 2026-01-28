# How to Get Your Firebase VAPID Key

The VAPID key is required for Firebase Cloud Messaging (push notifications) to work. Follow these steps to get it:

## Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **starklabsafrica**

## Step 2: Navigate to Cloud Messaging Settings

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **Project Settings**
3. Click on the **Cloud Messaging** tab

## Step 3: Generate or Copy VAPID Key

### If you already have a VAPID key:
- Scroll down to **Web Push certificates** section
- Copy the **Key pair** value (it's a long string)

### If you don't have a VAPID key:
1. Scroll down to **Web Push certificates** section
2. Click **Generate key pair** button
3. Copy the generated **Key pair** value

## Step 4: Add to Your `.env.local` File

Open your `.env.local` file and update the VAPID key:

```env
NEXT_PUBLIC_VAPID_KEY=your_actual_vapid_key_here
```

Replace `your_actual_vapid_key_here` with the key you copied from Firebase Console.

**Important:** 
- Don't add quotes around the value
- Don't add spaces around the `=` sign
- The key should be a long string (usually starts with `B` or similar)

## Step 5: Restart Your Dev Server

After updating `.env.local`, restart your dev server:

```bash
# Stop the server (Ctrl+C), then:
npm run dev
```

## Step 6: Test Push Notifications

1. Open your app in the browser
2. Grant notification permissions when prompted
3. Check the browser console for any errors
4. You should see: `✅ FCM Token: [your-token]`

## Troubleshooting

### Error: "Request is missing required authentication credential"
- **Cause:** VAPID key is missing or incorrect
- **Solution:** 
  1. Verify the VAPID key in `.env.local` matches the one in Firebase Console
  2. Make sure there are no extra spaces or quotes
  3. Restart your dev server

### Error: "VAPID key not configured"
- **Cause:** The environment variable is not set or is still a placeholder
- **Solution:** 
  1. Check `.env.local` has `NEXT_PUBLIC_VAPID_KEY` set
  2. Make sure it's not `your_vapid_key_here` (placeholder)
  3. Restart your dev server

### VAPID Key Format

A valid VAPID key looks like this:
```
BHuD2rxDyMLRqFI9wYZNC3rFrm5I_cxILuD3oJWheDBN_BE_V2HdYXBIYR2iyLqxiIG1bTeFZeRrWAz9W-Hv29Y
```

It's typically:
- 87 characters long
- Contains letters, numbers, underscores, and hyphens
- Base64-encoded string

## Notes

- The VAPID key is **public** and safe to expose in client-side code (that's why it's `NEXT_PUBLIC_`)
- Each Firebase project has its own VAPID key
- You can regenerate the key if needed, but you'll need to update it in your app
- Push notifications won't work without a valid VAPID key

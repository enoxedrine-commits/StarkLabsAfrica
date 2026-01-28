This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

### 1. Environment Setup

**Important:** This project uses environment variables for Firebase configuration.

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Firebase credentials in `.env.local`:
   - Get values from [Firebase Console](https://console.firebase.google.com/) → Project Settings → General → Your apps → Web app
   - Add all `NEXT_PUBLIC_FIREBASE_*` variables
   - Add `GOOGLE_API_KEY` for AI chat
   - Add `NEXTAUTH_SECRET` (generate a random string)

3. Update `.firebaserc` with your Firebase project ID

4. See `SETUP_CHECKLIST.md` for detailed setup instructions

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Note:** The build script automatically injects Firebase configuration into the service worker before starting the dev server.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

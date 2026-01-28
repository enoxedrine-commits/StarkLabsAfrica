import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: "HelloQuip",
  description: "Medical eCommerce",
  manifest: "/manifest.json",
  icons: { icon: "/Slogo.png" },
  themeColor: "#0f4a73",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HelloQuip",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Critical resource hints for faster loading */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/Slogo.png" as="image" type="image/png" />
        <link rel="preload" href="/fallback.jpg" as="image" type="image/jpeg" />
        
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://cdn-icons-png.flaticon.com" />
        
        {/* Preconnect to Firebase Auth */}
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://securetoken.googleapis.com" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="HelloQuip" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HelloQuip" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0f4a73" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* PWA Links */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/Slogo.png" />
      </head>
      <body className="roboto">
        <ClientWrapper>{children}</ClientWrapper>
        <SpeedInsights />
      </body>
    </html>
  );
}

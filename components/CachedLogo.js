"use client";

import Image from 'next/image';
import { useState } from 'react';

const CachedLogo = ({ 
  variant = 'default', // 'default', 'footer', 'loading', 'register'
  className = '',
  onClick,
  priority = false,
  width,
  height,
  forceRefresh = false // Add this prop to force refresh the logo
}) => {
  const [imageError, setImageError] = useState(false);

  // Logo URLs for different variants
  // Note: Update these URLs after uploading logos to your Firebase Storage
  // Format: https://firebasestorage.googleapis.com/v0/b/{STORAGE_BUCKET}/o/{FILE_PATH}?alt=media&token={TOKEN}
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project-id.firebasestorage.app';
  const logoUrls = {
    default: process.env.NEXT_PUBLIC_LOGO_URL_DEFAULT || `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/HQlogo.png?alt=media&token=580aa6cc-f6d0-4ace-bcda-8e7b6b573821`,
    footer: process.env.NEXT_PUBLIC_LOGO_URL_FOOTER || `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/HQlogo.png?alt=media&token=580aa6cc-f6d0-4ace-bcda-8e7b6b573821`,
    loading: process.env.NEXT_PUBLIC_LOGO_URL_LOADING || `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/HQlogo3.png?alt=media&token=22b28cda-b3db-4508-a374-9c374d2a4294`,
    register: process.env.NEXT_PUBLIC_LOGO_URL_REGISTER || `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/HQlogo3.png?alt=media&token=22b28cda-b3db-4508-a374-9c374d2a4294`
  };

  // Default dimensions for different variants
  const defaultDimensions = {
    default: { width: 56, height: 56 }, // h-12 md:h-14
    footer: { width: 48, height: 48 }, // h-12
    loading: { width: 64, height: 64 }, // h-14 md:h-16
    register: { width: 40, height: 40 } // h-10
  };

  const logoUrl = logoUrls[variant] || logoUrls.default;
  const dimensions = width && height ? { width, height } : defaultDimensions[variant];
  
  // Add cache-busting parameter if forceRefresh is true
  const finalLogoUrl = forceRefresh ? `${logoUrl}&t=${Date.now()}` : logoUrl;

  // Fallback to regular img tag if Image component fails
  if (imageError) {
    return (
      <img
        src={finalLogoUrl}
        alt="HeloQuip Logo"
        className={className}
        onClick={onClick}
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          objectFit: 'contain'
        }}
      />
    );
  }

  return (
    <Image
      src={finalLogoUrl}
      alt="HeloQuip Logo"
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      onClick={onClick}
      priority={priority}
      quality={100}
      // Cache for 30 days
      unoptimized={true}
      onError={() => setImageError(true)}
      // Add cache headers via Next.js Image optimization
      style={{
        objectFit: 'contain',
        imageRendering: 'crisp-edges',
        imageRendering: '-webkit-optimize-contrast'
      }}
    />
  );
};

export default CachedLogo;


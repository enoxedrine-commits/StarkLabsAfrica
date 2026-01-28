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
  // Using Slogo.png for all variants (local file in public folder)
  // Check if env vars are placeholders and fall back to local file
  const isPlaceholder = (url) => {
    if (!url) return true;
    return url.includes('your-project-id') || url.includes('YOUR_TOKEN') || url.includes('your_vapid_key');
  };

  const logoUrls = {
    default: (process.env.NEXT_PUBLIC_LOGO_URL_DEFAULT && !isPlaceholder(process.env.NEXT_PUBLIC_LOGO_URL_DEFAULT)) 
      ? process.env.NEXT_PUBLIC_LOGO_URL_DEFAULT 
      : "/Slogo.png",
    footer: (process.env.NEXT_PUBLIC_LOGO_URL_FOOTER && !isPlaceholder(process.env.NEXT_PUBLIC_LOGO_URL_FOOTER)) 
      ? process.env.NEXT_PUBLIC_LOGO_URL_FOOTER 
      : "/Slogo.png",
    loading: (process.env.NEXT_PUBLIC_LOGO_URL_LOADING && !isPlaceholder(process.env.NEXT_PUBLIC_LOGO_URL_LOADING)) 
      ? process.env.NEXT_PUBLIC_LOGO_URL_LOADING 
      : "/Slogo.png",
    register: (process.env.NEXT_PUBLIC_LOGO_URL_REGISTER && !isPlaceholder(process.env.NEXT_PUBLIC_LOGO_URL_REGISTER)) 
      ? process.env.NEXT_PUBLIC_LOGO_URL_REGISTER 
      : "/Slogo.png"
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
        alt="StarkLabs Electronics Logo"
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
      alt="StarkLabs Electronics Logo"
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


"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * ProductImage - Handles image loading errors gracefully
 * Falls back to placeholder when image fails to load
 */
export default function ProductImage({ 
  src, 
  alt, 
  fill = false, 
  width, 
  height, 
  className = "",
  sizes,
  priority = false,
  ...props 
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Use fallback if error occurred or no src
  const finalSrc = imageError || !src ? '/fallback.jpg' : src;

  // Don't optimize fallback images, data URLs, or Firebase Storage URLs
  // Firebase Storage URLs with query parameters (tokens) don't work well with Next.js optimization
  const isFirebaseStorageUrl = typeof src === 'string' && src.includes('firebasestorage.googleapis.com');
  const unoptimized = finalSrc === '/fallback.jpg' || src?.startsWith('data:') || isFirebaseStorageUrl;

  const handleError = (e) => {
    console.error('❌ ProductImage: Image failed to load:', {
      src: src,
      finalSrc: finalSrc,
      error: e,
      targetSrc: e?.target?.src
    });
    setImageError(true);
    setImageLoaded(true);
  };

  const handleLoad = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ ProductImage: Image loaded successfully:', src);
    }
    setImageLoaded(true);
  };

  // Debug: Log what URL we're trying to load
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 ProductImage Debug:', {
      src: src,
      finalSrc: finalSrc,
      isFirebaseUrl: isFirebaseStorageUrl,
      unoptimized: unoptimized,
      imageError: imageError,
      willShowPlaceholder: imageError || !src
    });
  }

  // Show placeholder while loading or on error
  if (imageError || !src || src === '/fallback.jpg') {
    return (
      <div className={`${fill ? 'absolute inset-0' : ''} flex items-center justify-center bg-gray-200 text-gray-400 ${className}`}>
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src: finalSrc,
    alt: alt || 'Product image',
    onError: handleError,
    onLoad: handleLoad,
    unoptimized,
    priority,
    ...props,
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
      className={className}
    />
  );
}

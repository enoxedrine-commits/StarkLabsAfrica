"use client";

import { useState, useEffect } from 'react';
import CachedLogo from './CachedLogo';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages = [
    "Welcome"
  ];

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => onComplete(), 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => {
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] bg-white">
      <div className="text-center">
        {/* Logo Area */}
        <div className="mb-8">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <CachedLogo
              variant="loading"
              className="h-14 md:h-16 w-auto"
              priority={true}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-4">
          <div className="rounded-full h-2 overflow-hidden" style={{ background: 'rgba(0, 179, 255, 0.2)' }}>
            <div 
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-blue))',
                boxShadow: '0 0 8px var(--glow-blue)'
              }}
            />
          </div>
        </div>

        {/* Progress Percentage */}
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {Math.round(Math.min(progress, 100))}%
        </p>

        {/* Loading Dots Animation */}
        <div className="flex justify-center mt-6 space-x-1">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', animationDelay: '0ms', boxShadow: '0 0 8px var(--glow-blue)' }}></div>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', animationDelay: '150ms', boxShadow: '0 0 8px var(--glow-blue)' }}></div>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-blue)', animationDelay: '300ms', boxShadow: '0 0 8px var(--glow-blue)' }}></div>
        </div>
      </div>
    </div>
  );
}
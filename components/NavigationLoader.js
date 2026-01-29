"use client";

import { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

// Context for navigation loading state
const NavigationLoadingContext = createContext({
  isNavigating: false,
  startNavigation: () => {},
  endNavigation: () => {},
  navigateTo: null, // null so consumers can check if context is ready
});

export const useNavigationLoading = () => useContext(NavigationLoadingContext);

// Inner component that uses searchParams (needs Suspense boundary)
function NavigationLoadingInner({ children }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  // Navigate with loading state
  const navigateTo = useCallback((url) => {
    setIsNavigating(true);
    router.push(url);
  }, [router]);

  // End loading when route changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept link clicks to show loading
  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest("a");
      if (target && target.href) {
        try {
          const url = new URL(target.href, window.location.origin);
          // Only show loading for internal navigation to different paths
          if (url.origin === window.location.origin && url.pathname !== pathname) {
            setIsNavigating(true);
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // Safety timeout - hide loader after 8s max
  useEffect(() => {
    if (isNavigating) {
      const timeout = setTimeout(() => {
        setIsNavigating(false);
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [isNavigating]);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, startNavigation, endNavigation, navigateTo }}>
      {children}
      {isNavigating && <NavigationLoadingOverlay />}
    </NavigationLoadingContext.Provider>
  );
}

// Provider component with Suspense boundary
export function NavigationLoadingProvider({ children }) {
  return (
    <Suspense fallback={children}>
      <NavigationLoadingInner>{children}</NavigationLoadingInner>
    </Suspense>
  );
}

// Loading overlay component
function NavigationLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm pointer-events-auto">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="relative">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default NavigationLoadingProvider;

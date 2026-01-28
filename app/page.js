"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cacheUtils, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/cacheUtils";
import CachedLogo from "@/components/CachedLogo";

import RecentlyViewedProducts from "@/components/RecentlyViewedProducts";
import LatestProducts from "@/components/LatestProducts";
import dynamic from "next/dynamic";
import { useDisplaySettings } from "@/lib/useDisplaySettings";
import LoadingScreen from "@/components/LoadingScreen";
import SkeletonLoader from "@/components/SkeletonLoader";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Priority 1: Critical above-the-fold content (SSR enabled)
const TrendingProducts = dynamic(() => import("@/components/TrendingProducts"), {
  ssr: true,
  loading: () => (
    <div className="bg-gray-50 rounded-2xl shadow-sm p-4">
      <SkeletonLoader type="trending" />
    </div>
  ),
});

// Priority 2: Main content (SSR enabled for better LCP)
const FeaturedProducts = dynamic(() => import("@/components/FeaturedProducts"), {
  ssr: true,
  loading: () => (
    <section className="bg-gray/70 pt-0 md:pt-3 pb-0 relative" data-featured-products>
      <div className="max-w-7xl mx-auto px-0">
        {/* Fixed height container to prevent layout shift */}
        <div className="min-h-[2000px] md:min-h-[1500px]">
          <SkeletonLoader type="product-grid" />
        </div>
      </div>
    </section>
  ),
});

// Priority 3: Secondary content (deferred loading)
const Categories = dynamic(() => import("@/components/Categories"), {
  ssr: true,
  loading: () => (
    <div className="bg-gray-50 rounded-2xl shadow-sm p-4 mt-2">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Categories</h2>
      <SkeletonLoader type="category" />
    </div>
  ),
});

// Priority 4: Non-critical content (client-side only)
const Testimonials = dynamic(() => import("@/components/Testimonials"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <SkeletonLoader type="testimonials" />
    </div>
  ),
});

const ProductRecommendations = dynamic(() => import("@/components/ProductRecommendations"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <SkeletonLoader type="recommendations" />
    </div>
  ),
});

export default function Home() {
  const { loading: settingsLoading } = useDisplaySettings();
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All Products");
  const [loading, setLoading] = useState(true);
  const [featuredProductsLoaded, setFeaturedProductsLoaded] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [trendingProductsLoaded, setTrendingProductsLoaded] = useState(false);
  const [allProductsLoaded, setAllProductsLoaded] = useState(false);
  const [recommendationsLoaded, setRecommendationsLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledAllProducts, setHasScrolledAllProducts] = useState(false);
  
  // Progressive loading states
  const [criticalContentLoaded, setCriticalContentLoaded] = useState(false);
  const [secondaryContentLoaded, setSecondaryContentLoaded] = useState(false);


  // Check if we're on client side
  useEffect(() => {
    setIsClient(true);
    
    // Show content when loading screen is ready
    const timer = setTimeout(() => {
      document.documentElement.classList.add('loaded');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Preload critical images for better LCP
  useEffect(() => {
    if (!isClient || allProducts.length === 0) return;

    // Preload first few product images
    const preloadImages = () => {
      const firstImages = allProducts.slice(0, 6);
      
      firstImages.forEach((product, index) => {
        const imageUrl = product.imageUrl;
        if (!imageUrl) return;
        
        // Get the appropriate image URL based on variant
        let preloadUrl = imageUrl;
        if (typeof imageUrl === 'object') {
          preloadUrl = imageUrl['100x100'] || imageUrl['90x90'] || imageUrl.original || Object.values(imageUrl)[0];
        }
        
        // Create and preload image using native HTML Image constructor
        const img = new window.Image();
        img.src = preloadUrl;
        img.loading = 'eager';
        img.fetchPriority = index < 3 ? 'high' : 'low';
        
        console.log(`🖼️ Preloading image ${index + 1}/6:`, preloadUrl);
      });
    };

    // Preload images after a short delay to not block initial render
    const timer = setTimeout(preloadImages, 100);
    
    return () => clearTimeout(timer);
  }, [isClient, allProducts]);

  // Update trending product preload when trending products load
  useEffect(() => {
    if (!isClient || !trendingProductsLoaded) return;

    // This will be called when trending products are loaded
    // The TrendingProducts component will handle its own preloading
    console.log('🔥 Trending products loaded, preload hints active');
  }, [isClient, trendingProductsLoaded]);

  // Progressive loading: Critical content (Trending + Categories)
  useEffect(() => {
    if (trendingProductsLoaded && categoriesLoaded) {
      setCriticalContentLoaded(true);
    }
  }, [trendingProductsLoaded, categoriesLoaded]);

  // Progressive loading: Secondary content (Featured Products)
  useEffect(() => {
    if (featuredProductsLoaded) {
      setSecondaryContentLoaded(true);
    }
  }, [featuredProductsLoaded]);

  // Decide whether to show the loading screen for this session (once per browser session)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Skip loading screen on back/forward navigations (e.g., returning from product)
      const navEntry = performance.getEntriesByType('navigation')[0];
      const isBackForward = navEntry && navEntry.type === 'back_forward';
      const shownThisSession = sessionStorage.getItem('loadingScreenShown') === '1';
      if (!shownThisSession && !isBackForward) {
        setShowLoadingScreen(true);
        sessionStorage.setItem('loadingScreenShown', '1');
      } else {
        setShowLoadingScreen(false);
      }
    } catch {
      setShowLoadingScreen(false);
    }
  }, []);

  // Hide loading screen when critical content is ready (faster FCP)
  useEffect(() => {
    if (!showLoadingScreen) return;
    if (criticalContentLoaded) {
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 50); // Minimal delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [showLoadingScreen, criticalContentLoaded]);

  // Hide loading screen when all components are loaded
  useEffect(() => {
    if (!showLoadingScreen) return;
    console.log('🔍 Loading states:', {
      featuredProductsLoaded,
      categoriesLoaded,
      trendingProductsLoaded,
      allProductsLoaded,
      recommendationsLoaded,
      loading,
      showLoadingScreen
    });
    
    if (featuredProductsLoaded && categoriesLoaded && trendingProductsLoaded && allProductsLoaded && recommendationsLoaded && !loading) {
      console.log('✅ All components loaded, hiding loading screen');
      setShowLoadingScreen(false);
    }
  }, [featuredProductsLoaded, categoriesLoaded, trendingProductsLoaded, allProductsLoaded, recommendationsLoaded, loading, showLoadingScreen]);

  // Fallback: force-hide loading screen after a short timeout to avoid getting stuck on back navigation
  useEffect(() => {
    if (!showLoadingScreen) return;
    const fallback = setTimeout(() => setShowLoadingScreen(false), 1200);
    return () => clearTimeout(fallback);
  }, [showLoadingScreen]);

  // Hard guard: always hide loader quickly when on home, regardless of nav type
  useEffect(() => {
    setShowLoadingScreen(false);
    const hardFallback = setTimeout(() => setShowLoadingScreen(false), 500);
    return () => clearTimeout(hardFallback);
  }, []);


  // Function to clear cache and refresh data
  const refreshData = () => {
    if (!isClient) return;
    
    console.log('🔄 Manually refreshing data...');
    
    try {
      cacheUtils.clearCache(CACHE_KEYS.MAIN_PRODUCTS);
      setLoading(true);
      
      // Force refresh the page data
      const fetchProducts = async () => {
        try {
          const snapshot = await getDocs(collection(db, "products"));
          const products = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          setAllProducts(products);
          
          // Cache the products for future use
          cacheUtils.setCache(CACHE_KEYS.MAIN_PRODUCTS, products, CACHE_DURATIONS.MAIN_PRODUCTS);
          
          console.log('📦 Fetched and cached products:', products.length);
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchProducts();
    } catch (error) {
      console.error('Error refreshing data:', error);
      setLoading(false);
    }
  };

  // Listen for page visibility changes to refresh stale cache
  useEffect(() => {
    if (!isClient) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const cacheAge = cacheUtils.getCacheAge(CACHE_KEYS.MAIN_PRODUCTS);
          if (cacheAge !== null && cacheAge > 5 * 60) { // 5 minutes in seconds
            console.log('🔄 Page became visible, cache is stale, refreshing...');
            refreshData();
          }
        } catch (error) {
          console.warn('Error checking cache age:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;

    const fetchProducts = async () => {
      // Check if we have cached products first
      const cachedProducts = cacheUtils.getCache(CACHE_KEYS.MAIN_PRODUCTS, CACHE_DURATIONS.MAIN_PRODUCTS);
      
      if (cachedProducts) {
        setAllProducts(cachedProducts);
        setLoading(false);
        setAllProductsLoaded(true);
        console.log('📦 Using cached products:', cachedProducts.length);
        return;
      }
      
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setAllProducts(products);
        setAllProductsLoaded(true);
        
        // Cache the products for future use
        cacheUtils.setCache(CACHE_KEYS.MAIN_PRODUCTS, products, CACHE_DURATIONS.MAIN_PRODUCTS);
        
        console.log('📦 Fetched and cached products:', products.length);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isClient]);

  // Check if all components are loaded
  const allComponentsLoaded = featuredProductsLoaded && categoriesLoaded;

  // Show loading spinner only when components are loading
  const showLoading = loading || !allComponentsLoaded;

  // Internet connection check before loading main page components
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  useEffect(() => {
    if (!isClient) return;

    // Check internet connection
    const checkConnection = async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        setIsOnline(true);
      } catch (error) {
        console.log('📡 No internet connection detected');
        setIsOnline(false);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();

    // Set up online/offline event listeners
    const handleOnline = () => {
      console.log('🌐 Internet connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📡 Internet connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClient]);

  // Show connection status and handle loading
  useEffect(() => {
    if (!isClient) return;

    if (!isCheckingConnection && !isOnline) {
      // Show offline message and prevent loading
      console.log('📡 Offline - preventing component loading');
      return;
    }

    if (!isCheckingConnection && isOnline) {
      // Online - allow normal loading
      console.log('🌐 Online - allowing component loading');
    }
  }, [isClient, showLoading, isOnline, isCheckingConnection]);

  // Basic mobile screenshot prevention only
  useEffect(() => {
    if (!isClient) return;

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      console.log('📱 Mobile device detected - applying basic screenshot protection');
      
      // Only prevent context menu, allow all touch events for scrolling
      const preventContextMenu = (e) => {
        e.preventDefault();
      };

      document.addEventListener('contextmenu', preventContextMenu);
      
      return () => {
        document.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, [isClient]);

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#255cdc] flex items-center justify-center">
        <CachedLogo
          variant="loading"
          width={64}
          height={64}
          priority={true}
          className="h-16 w-auto"
        />
      </div>
    );
  }

  return (
    <>
      {/* Preload critical images for better LCP */}
      {allProducts.length > 0 && (
        <>
          {/* Preload first few product images */}
          {allProducts.slice(0, 6).map((product, index) => {
            const imageUrl = product.imageUrl;
            if (!imageUrl) return null;
            
            // Get the appropriate image URL based on variant
            let preloadUrl = imageUrl;
            if (typeof imageUrl === 'object') {
              preloadUrl = imageUrl['100x100'] || imageUrl['90x90'] || imageUrl.original || Object.values(imageUrl)[0];
            }
            
            // Create Next.js optimized URL for preload
            const optimizedUrl = `/_next/image?url=${encodeURIComponent(preloadUrl)}&w=200&q=75`;
            
            return (
              <link
                key={`preload-${product.id}`}
                rel="preload"
                as="image"
                href={optimizedUrl}
                fetchPriority={index < 3 ? "high" : "low"}
              />
            );
          })}
        </>
      )}

      {/* Preload trending product image (likely LCP element) */}
      {/* This will be dynamically updated when trending products load */}
      <link
        rel="preload"
        as="image"
        href={process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || "/fallback.jpg"}
        fetchPriority="high"
        id="trending-preload"
      />

      {/* Always show loading screen first to prevent content flash */}
      {showLoadingScreen && (
        <LoadingScreen onComplete={() => setShowLoadingScreen(false)} />
      )}

      {/* Main Layout - Only render when loading screen is hidden */}
      {!showLoadingScreen && (
        <div className="min-h-screen bg-[#255cdc]" data-page="home">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-1 pt-2 pb-3">
            {/* Top Row - Categories, Trending Products, and Featured Deal */}
            <div className="grid grid-cols-[280px_1fr_300px] gap-3 mb-4">
              {/* Categories */}
              <section className="bg-gray-50 rounded-2xl shadow-sm p-4 h-[364px] flex flex-col overflow-hidden">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex-shrink-0">Categories</h2>
                <div className="flex-1 overflow-y-auto pr-2 categories-scroll">
                <Categories 
                  onCategorySelect={setSelectedCategory} 
                  onLoadComplete={() => setCategoriesLoaded(true)}
                />
                </div>
              </section>

              {/* Trending Products */}
              <section className="bg-gray-50 rounded-2xl shadow-sm p-0 h-[364px] flex flex-col overflow-hidden">
                <div className="h-full w-full min-h-0 flex flex-col">
                <TrendingProducts onLoadComplete={() => setTrendingProductsLoaded(true)} />
                </div>
              </section>

              {/* Featured Deal */}
              <section className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white h-[364px]">
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-4">Special Offer</h3>
                    <p className="text-lg mb-6">Get 20% off on all medical equipment this month!</p>
                    <button className="bg-white text-green-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                      Shop Now
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Latest - horizontally scrollable row just before products */}
            <LatestProducts />

            {/* Featured Products */}
            <section className="mb-4">
              <FeaturedProducts 
                selectedCategory={selectedCategory} 
                onLoadComplete={() => setFeaturedProductsLoaded(true)}
                onScrollProgressChange={(progress, hasScrolledAll) => {
                  setScrollProgress(progress);
                  setHasScrolledAllProducts(hasScrolledAll);
                }}
              />
            </section>

            {/* Recently Viewed - after products, before Testimonials */}
            <section className="mb-4">
              <RecentlyViewedProducts limit={16} showTitle={true} />
            </section>

            {/* Bottom Row - Product Recommendations and Testimonials */}
            {/* <div className="grid grid-cols-[1fr_300px] gap-3">
              Product Recommendations
              <ProductRecommendations limit={6} onLoadComplete={() => setRecommendationsLoaded(true)} />
            </div> */}

            {/* Customer Testimonials - Full Width */}
            <section className="bg-white rounded-2xl shadow-sm p-4">
              <Testimonials />
            </section>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="block md:hidden">
          <div className="px-1 py-1">

            {/* Mobile Categories */}
            <div className="bg-white rounded-xl py-3 mb-1 mt-[15px]">
              <Categories 
                onCategorySelect={setSelectedCategory} 
                onLoadComplete={() => setCategoriesLoaded(true)}
              />
            </div>

            {/* Trending Products */}
            <section className="bg-white rounded-xl mb-1">
              <h2 className="hidden text-xl font-bold text-gray-800 mb-3 px-2">Trending Products</h2>
              <TrendingProducts onLoadComplete={() => setTrendingProductsLoaded(true)} />
            </section>

            {/* Featured Products */}
            <section className="mb-1">
              <h2 className="hidden text-xl font-bold text-gray-800 mb-3 px-2">Featured Products</h2>
              <FeaturedProducts 
                selectedCategory={selectedCategory} 
                onLoadComplete={() => setFeaturedProductsLoaded(true)}
                onScrollProgressChange={(progress, hasScrolledAll) => {
                  setScrollProgress(progress);
                  setHasScrolledAllProducts(hasScrolledAll);
                }}
              />
            </section>


            {/* Product Recommendations - Mobile */}
            {/* <ProductRecommendations limit={4} onLoadComplete={() => setRecommendationsLoaded(true)} /> */}

            {/* Promotional Banner */}
            {/* <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white mb-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Special Offers</h3>
                <p className="text-sm mb-4">Get amazing deals on medical equipment</p>
                <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                  View Offers
                </button>
              </div>
            </section> */}

            {/* Customer Testimonials - Mobile */}
            <section className="bg-white rounded-xl p-4 mb-4">
              <Testimonials />
            </section>
          </div>
        </div>
        </div>
      )}
      
      {/* Speed Insights for monitoring LCP performance */}
      <SpeedInsights />
    </>
  );
}
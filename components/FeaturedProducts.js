



"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useProductSettings, formatProductName } from "@/hooks/useProductSettings";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  addDoc,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "./ProductCard";
import RecentlyViewedProducts from "./RecentlyViewedProducts";
import SkeletonLoader from "./SkeletonLoader";
import { useDisplaySettings } from "@/lib/useDisplaySettings";
import Pagination from "./Pagination";
import { getScrollManager } from "@/lib/scrollPositionManager";
import HorizontalScrollWithArrows from "./HorizontalScrollWithArrows";


// Helper to decode URL and pick preferred size
const getPreferredImageUrl = (imageUrl, customResolution = null) => {
  if (!imageUrl) return null;

  // If it's a string, decode and return
  if (typeof imageUrl === "string") {
    try {
      return decodeURIComponent(imageUrl);
    } catch {
      return imageUrl;
    }
  }

  // If it's an object with sizes, use custom resolution or fallback
  if (typeof imageUrl === "object") {
    let preferred;
    
    if (customResolution && imageUrl[customResolution]) {
      preferred = imageUrl[customResolution];
    } else {
      // Fallback to 200x200 or original or first available
      preferred = imageUrl["200x200"] || imageUrl["original"] || Object.values(imageUrl)[0];
    }
    
    try {
      return decodeURIComponent(preferred);
    } catch {
      return preferred;
    }
  }

  return null;
};

export default function FeaturedProducts({ selectedCategory, keyword, tags, manufacturer, name, onLoadComplete, onScrollProgressChange }) {
  const { settings } = useProductSettings();
  const { featuredCardResolution, loading: settingsLoading } = useDisplaySettings();
  const { data: session } = useSession();
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [allProducts, setAllProducts] = useState([]); // All fetched products
  const [products, setProducts] = useState([]); // Currently displayed products (paginated)
  const [displayProducts, setDisplayProducts] = useState([]); // Products actually rendered
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Keep for latestProducts logic
  const [trendingProductIds, setTrendingProductIds] = useState(new Set());
  const [latestProducts, setLatestProducts] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledAllProducts, setHasScrolledAllProducts] = useState(false);
  const [recentlyViewedLoaded, setRecentlyViewedLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const prevPageRef = useRef(1);
  const router = useRouter();
  const pathname = usePathname();
  const scrollManagerRef = useRef(null);
  const initialPageSize = 48; // Both desktop and mobile: Show first 48 products
  const pageSize = 30; // Both desktop and mobile: 30 products per page after initial 48

  // Products are now sorted consistently by creation date (oldest first)
  // No more randomization to ensure users can track their progress


  // Initialize scroll manager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      scrollManagerRef.current = getScrollManager();
    }
  }, []);

  // Restore page from URL params on mount (only if not already restored)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (pathname === '/' && !hasInitializedRef.current) {
      const pageParam = typeof window !== 'undefined'
        ? new URL(window.location.href).searchParams.get('page')
        : null;
      if (pageParam) {
        const pageNum = parseInt(pageParam, 10);
        if (!isNaN(pageNum) && pageNum >= 1) {
          setCurrentPage(pageNum);
          prevPageRef.current = pageNum;
          hasInitializedRef.current = true;
        }
      } else {
        hasInitializedRef.current = true;
      }
    }
  }, [pathname]);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch trending product IDs
  const fetchTrendingProductIds = useCallback(async () => {
    try {
      const trendingSnapshot = await getDocs(collection(db, "trendingProducts"));
      const trendingIds = new Set(trendingSnapshot.docs.map(doc => doc.data().productId));
      setTrendingProductIds(trendingIds);
    } catch (error) {
      console.error("Error fetching trending product IDs:", error);
    }
  }, []);

  // Fetch all products for pagination
  const fetchAllProducts = useCallback(async () => {
      setLoading(true);
      try {
      console.log('🔍 Fetching all products for pagination...');
      
      // Fetch all products without limit - get everything
      const q = query(collection(db, "products"));
        const querySnapshot = await getDocs(q);

      let fetchedProducts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      // Sort products: displayOrder first (if set by admin), then createdAt
      fetchedProducts.sort((a, b) => {
        // Products with displayOrder come first
        const aHasOrder = a.displayOrder !== undefined && a.displayOrder !== null;
        const bHasOrder = b.displayOrder !== undefined && b.displayOrder !== null;
        
        if (aHasOrder && bHasOrder) {
          // Ensure displayOrder is treated as a number for proper sorting
          const aOrder = Number(a.displayOrder) || 0;
          const bOrder = Number(b.displayOrder) || 0;
          return aOrder - bOrder;
        }
        if (aHasOrder && !bHasOrder) return -1;
        if (!aHasOrder && bHasOrder) return 1;
        
        // Both don't have displayOrder, sort by createdAt
        const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return aDate - bDate;
      });

      // Filter by similarity if search criteria exist
        if (keyword || name || manufacturer || (tags && tags.length)) {
          const lowerKeyword = keyword?.trim().toLowerCase();
          const lowerName = name?.trim().toLowerCase();
          const lowerManufacturer = manufacturer?.trim().toLowerCase();
          const tagSet = new Set((tags || []).map((tag) => tag.toLowerCase()));

        fetchedProducts = fetchedProducts.filter((product) => {
          const nameMatch = lowerKeyword && product.name?.toLowerCase().includes(lowerKeyword);
          const descMatch = lowerKeyword && product.description?.toLowerCase().includes(lowerKeyword);
          const nameSimMatch = lowerName && product.name?.toLowerCase().includes(lowerName);
          const manufacturerMatch = lowerManufacturer && product.manufacturer?.toLowerCase().includes(lowerManufacturer);
          const tagMatch = product.tags && Array.isArray(product.tags) && product.tags.some((tag) => tagSet.has(tag.toLowerCase()));
          return nameMatch || descMatch || nameSimMatch || manufacturerMatch || tagMatch;
        });
      }

      setAllProducts(fetchedProducts);
      console.log(`📦 Fetched ${fetchedProducts.length} products for pagination`);
      } catch (err) {
        console.error("Error fetching products:", err);
      setAllProducts([]);
      }
      setLoading(false);
  }, [keyword, tags, manufacturer, name]);


  // Fetch latest uploads (last 2 months up to current hour)
  useEffect(() => {
    const loadLatest = async () => {
      try {
        // Client-side filter from main list if available; otherwise do a best-effort fetch-all
        const now = new Date(); // Current time (up to this very hour)
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(now.getMonth() - 2); // Go back 2 months
        twoMonthsAgo.setHours(0, 0, 0, 0); // Start of day 2 months ago

        const normalizeDate = (p) => {
          const ts = p.createdAt || p.uploadedAt || p.updatedAt || p.timestamp || p.created_at;
          if (!ts) return null;
          
          try {
            // Firestore Timestamp
            if (ts && typeof ts.toDate === 'function') {
              return ts.toDate();
            }
            // JavaScript Date object
            if (ts instanceof Date) {
              return ts;
            }
            // ISO string or millis
            const d = new Date(ts);
            return isNaN(d.getTime()) ? null : d;
          } catch (error) {
            console.warn('Error normalizing date for product:', p.id, error);
            return null;
          }
        };

        // Always fetch fresh data for latest products to ensure new uploads appear immediately
        const snapshot = await getDocs(collection(db, "products"));
        const source = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        console.log('Total products available:', source.length);
        console.log('Looking for products created from last 2 months:', twoMonthsAgo.toISOString(), 'to', now.toISOString());

        const productsWithDates = source.map((p) => ({ p, d: normalizeDate(p) }));
        const validDates = productsWithDates.filter(({ d }) => d !== null);
        const recentProducts = validDates.filter(({ d }) => d >= twoMonthsAgo && d <= now);
        
        console.log('Products with valid dates:', validDates.length);
        console.log('Products created in last 2 months:', recentProducts.length);
        
        // Log some sample dates for debugging
        if (validDates.length > 0) {
          console.log('Sample product dates:', validDates.slice(0, 5).map(({ p, d }) => ({
            id: p.id,
            name: p.name,
            date: d.toISOString(),
            isRecent: d >= twoMonthsAgo && d <= now
          })));
        }

        const latest = recentProducts
          .sort((a, b) => b.d - a.d)
          .slice(0, 20) // Increased from 12 to 20
          .map(({ p }) => p);

        console.log('Latest products found (from last 2 months up to current hour):', latest.length, 'out of', source.length);
        
        // If no recent products, show first 20 products as "latest"
        if (latest.length === 0) {
          // Try to get products with any date first, then fallback to first 20
          const anyDateProducts = validDates
            .sort((a, b) => b.d - a.d)
            .slice(0, 20) // Increased from 8 to 20
            .map(({ p }) => p);
          
          const fallback = anyDateProducts.length > 0 ? anyDateProducts : source.slice(0, 20); // Increased from 8 to 20
          console.log('Using fallback latest products:', fallback.length);
          setLatestProducts(fallback);
        } else {
          setLatestProducts(latest);
        }
      } catch (e) {
        console.warn('Failed to load latest uploads:', e);
        // Fallback to first 20 products from allProducts
        const fallback = allProducts.length > 0 ? allProducts.slice(0, 20) : [];
        console.log('Error fallback latest products:', fallback.length);
        setLatestProducts(fallback);
      }
    };
    loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts.length]);

  // Fetch trending product IDs on component mount
  useEffect(() => {
    fetchTrendingProductIds();
  }, [fetchTrendingProductIds]);


  // Call onLoadComplete when component is fully loaded
  useEffect(() => {
    if (!loading && !settingsLoading && products.length > 0 && recentlyViewedLoaded && onLoadComplete) {
      const timer = setTimeout(() => {
        onLoadComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, settingsLoading, products.length, recentlyViewedLoaded, onLoadComplete]);

  // Paginate products based on current page
  useEffect(() => {
    if (allProducts.length === 0) {
      setProducts([]);
      setDisplayProducts([]);
      return;
    }

    let startIndex = 0;
    let endIndex = 0;

    // Both desktop and mobile: First page shows 48, subsequent pages show 30
    if (currentPage === 1) {
      startIndex = 0;
      endIndex = initialPageSize;
    } else {
      // Page 2+ starts after 48, then 30 per page
      startIndex = initialPageSize + (currentPage - 2) * pageSize;
      endIndex = startIndex + pageSize;
    }

    const paginatedProducts = allProducts.slice(startIndex, endIndex);
    setProducts(paginatedProducts);
    
    console.log(`📄 Page ${currentPage}: Showing products ${startIndex + 1}-${Math.min(endIndex, allProducts.length)} of ${allProducts.length}`);
  }, [allProducts, currentPage, initialPageSize, pageSize]);

  // Track if we need to scroll after products update
  const shouldScrollAfterUpdateRef = useRef(false);
  const pageChangeTimeoutRef = useRef(null);
  const pendingScrollTopRef = useRef(false);
  const currentPageRef = useRef(1);
  const scrollPinIntervalRef = useRef(null);
  const prevScrollRestorationRef = useRef(null);
  const productsTopRef = useRef(null);
  const targetPageRef = useRef(1);
  const pendingReturnRef = useRef(null);
  const [returnToken, setReturnToken] = useState(0);
  const criteriaRef = useRef(null);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const getTopOffset = () => {
    // Navbar spacing is already handled by the fixed header spacer in layout.
    // Keep this offset minimal so pagination anchors land at the true top.
    return 0;
  };

  const scrollToProductsTop = () => {
    if (typeof window === 'undefined') return;
    const offset = getTopOffset();
    const el = productsTopRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      // scrollMarginTop is applied on the element below
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      return;
    }
    // Fallback: absolute scroll
    window.scrollTo(0, offset);
  };

  const readPageFromUrl = () => {
    if (typeof window === 'undefined') return 1;
    const pageParam = new URL(window.location.href).searchParams.get('page');
    const pageNum = pageParam ? parseInt(pageParam, 10) : 1;
    return !isNaN(pageNum) && pageNum >= 1 ? pageNum : 1;
  };

  const consumeReturnState = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('featuredProducts_return');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      // Expire after 10 minutes
      if (data.ts && Date.now() - data.ts > 10 * 60 * 1000) {
        sessionStorage.removeItem('featuredProducts_return');
        return null;
      }
      // Do not remove yet; remove after successful restore
      return data;
    } catch {
      return null;
    }
  };

  const startScrollPin = () => {
    if (typeof window === 'undefined') return;
    const top = getTopOffset();

    // Stop any previous pin
    if (scrollPinIntervalRef.current) {
      clearInterval(scrollPinIntervalRef.current);
      scrollPinIntervalRef.current = null;
    }

    // Disable browser scroll restoration while paginating (helps on mobile)
    try {
      prevScrollRestorationRef.current = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
    } catch {}

    // Pin scroll near top for a short window to beat scroll anchoring
    const startedAt = Date.now();
    scrollPinIntervalRef.current = setInterval(() => {
      if (Date.now() - startedAt > 450) {
        stopScrollPin();
        return;
      }
      // Prefer element-based scroll (more stable on mobile)
      scrollToProductsTop();
    }, 50);

    // Immediate attempt
    window.scrollTo(0, top);
    scrollToProductsTop();
  };

  const stopScrollPin = () => {
    if (typeof window === 'undefined') return;
    if (scrollPinIntervalRef.current) {
      clearInterval(scrollPinIntervalRef.current);
      scrollPinIntervalRef.current = null;
    }
    try {
      if (prevScrollRestorationRef.current) {
        window.history.scrollRestoration = prevScrollRestorationRef.current;
      }
    } catch {}
    prevScrollRestorationRef.current = null;
  };
  
  // Update displayed products - sync immediately to prevent layout issues
  useEffect(() => {
    // Always keep displayProducts in sync with products
    if (products !== displayProducts) {
      setDisplayProducts(products);
      // Mark that we should scroll after this update if page changed
      if (prevPageRef.current !== currentPage) {
        shouldScrollAfterUpdateRef.current = true;
      }
    }
  }, [products, currentPage]);

  // Keep currentPage in sync with back/forward navigation (mobile-first)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/') return;

    const handlePopState = () => {
      const nextPage = readPageFromUrl();
      const returnState = consumeReturnState();

      if (returnState) {
        // Returning from product → restore exact scroll position (do NOT scroll to top)
        setIsPageChanging(true);
        pendingReturnRef.current = returnState;
        targetPageRef.current = typeof returnState.page === 'number' ? returnState.page : nextPage;
        setReturnToken((t) => t + 1);
      }

      if (nextPage !== currentPageRef.current) {
        // Only do the "scroll-to-top" behavior when not restoring an exact return position
        if (!returnState) {
          setIsPageChanging(true);
          pendingScrollTopRef.current = true;
          startScrollPin();
        }
        prevPageRef.current = currentPageRef.current;
        setCurrentPage(nextPage);
      } else if (!returnState) {
        // Same page popstate (e.g. hash changes) - nothing to do
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pathname]);



  // Fetch all products when search criteria changes
  useEffect(() => {
    const searchCriteria = {
      keyword: keyword || "",
      name: name || "",
      manufacturer: manufacturer || "",
      tags: JSON.stringify(tags || [])
    };
    
    const currentCriteriaString = JSON.stringify(searchCriteria);
    const prevCriteria = criteriaRef.current;
    criteriaRef.current = currentCriteriaString;

    // Only reset to page 1 when criteria CHANGES after initial mount.
    // On initial mount / back navigation we let the URL (?page=) win.
    if (prevCriteria !== null && prevCriteria !== currentCriteriaString) {
      setCurrentPage(1);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('page');
        window.history.pushState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    }

    fetchAllProducts();
  }, [keyword, name, manufacturer, tags, fetchAllProducts]);

  // Initial fetch on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      console.log('🔄 Page loaded, fetching all products...');
      fetchAllProducts();
    }
  }, [fetchAllProducts]);

  // Calculate total pages
  const calculateTotalPages = () => {
    if (allProducts.length === 0) return 1;
    
    // Both desktop and mobile: First page has 48, rest have 30
    if (allProducts.length <= initialPageSize) return 1;
    const remainingProducts = allProducts.length - initialPageSize;
    return 1 + Math.ceil(remainingProducts / pageSize);
  };

  const totalPages = calculateTotalPages();

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      // Show loading overlay immediately
      setIsPageChanging(true);
      pendingScrollTopRef.current = true;
      targetPageRef.current = newPage;

      // Prevent focus/scroll anchoring from keeping the pagination button in view (mobile Safari/Chrome)
      try {
        if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      } catch {}

      // Start pinning scroll to top immediately (mobile-first)
      startScrollPin();
      
      // Clear any existing timeout
      if (pageChangeTimeoutRef.current) {
        clearTimeout(pageChangeTimeoutRef.current);
      }
      
      // Fallback timeout to ensure loading doesn't get stuck (max 2 seconds)
      pageChangeTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Fallback timeout: hiding loading overlay');
        setIsPageChanging(false);
        pageChangeTimeoutRef.current = null;
      }, 2000);
      
      // Save current scroll position before changing page
      if (scrollManagerRef.current && pathname === '/') {
        scrollManagerRef.current.savePosition('main');
      }

      // Update URL WITHOUT triggering Next.js navigation (critical for mobile scroll stability)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (newPage === 1) url.searchParams.delete('page');
        else url.searchParams.set('page', newPage.toString());
        window.history.pushState(window.history.state, "", url.pathname + url.search + url.hash);
      }

      prevPageRef.current = currentPage;
      // Delay the page state change to the next frame so the scroll pin applies first
      requestAnimationFrame(() => setCurrentPage(newPage));
      // Don't scroll here - wait for products to update first
    }
  };

  // Scroll to top AFTER products have been updated and rendered
  useLayoutEffect(() => {
    // Only scroll if we marked that we should scroll AND products have been updated
    if ((shouldScrollAfterUpdateRef.current || pendingScrollTopRef.current) && displayProducts.length > 0) {
      const scrollToTop = () => {
        if (typeof window !== 'undefined') {
          scrollToProductsTop();
        }
      };

      const hideOverlay = () => {
        setIsPageChanging(false);
        // Clear fallback timeout if it exists
        if (pageChangeTimeoutRef.current) {
          clearTimeout(pageChangeTimeoutRef.current);
          pageChangeTimeoutRef.current = null;
        }
      };

      // Scroll now (layout effect) and then do 1-2 small backups
      scrollToTop();
      setTimeout(scrollToTop, 0);
      setTimeout(scrollToTop, 50);
      setTimeout(() => {
        hideOverlay();
        stopScrollPin();
      }, 120);
      
      // Reset the flag and update prevPageRef
      shouldScrollAfterUpdateRef.current = false;
      pendingScrollTopRef.current = false;
      prevPageRef.current = currentPage;
    }
  }, [displayProducts.length, currentPage, isMobile]);

  // Restore exact scroll position when returning from a product
  useLayoutEffect(() => {
    if (!pendingReturnRef.current) return;
    if (displayProducts.length === 0) return;
    if (typeof window === 'undefined') return;

    const data = pendingReturnRef.current;
    const scrollY = typeof data.scrollY === 'number' ? data.scrollY : null;
    const desiredPage = typeof data.page === 'number' ? data.page : readPageFromUrl();

    // Ensure correct page first
    if (desiredPage !== currentPage) {
      // Let pagination flow handle render; we'll try again on next token change
      return;
    }

    // Restore scroll precisely
    if (scrollY !== null && !Number.isNaN(scrollY)) {
      window.scrollTo(0, scrollY);
    }

    // Cleanup
    try {
      sessionStorage.removeItem('featuredProducts_return');
    } catch {}
    pendingReturnRef.current = null;
    setIsPageChanging(false);
  }, [returnToken, displayProducts.length, currentPage]);

  // Function to track product views for recent section
  const trackProductView = async (userId, productId) => {
    try {
      console.log('🔍 Tracking product view:', { userId, productId });
      
      // Check if this view already exists for this user and product
      const recentViewsQuery = query(
        collection(db, "recentViews"),
        where("userId", "==", userId),
        where("productId", "==", productId)
      );
      
      const existingViews = await getDocs(recentViewsQuery);
      
      if (existingViews.empty) {
        // Create new view record
        const docRef = await addDoc(collection(db, "recentViews"), {
          userId,
          productId,
          viewedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        console.log('✅ Created new view record:', docRef.id);
      } else {
        // Update existing view record with new timestamp
        const viewDoc = existingViews.docs[0];
        await updateDoc(doc(db, "recentViews", viewDoc.id), {
          viewedAt: serverTimestamp()
        });
        console.log('🔄 Updated existing view record:', viewDoc.id);
      }
    } catch (error) {
      console.error('❌ Error tracking product view:', error);
    }
  };

  // Monitor Firebase Auth state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      console.log('🔥 Firebase Auth state changed:', user ? `Authenticated user: ${user.uid}` : 'No authenticated user');
    });
    return () => unsubscribe();
  }, []);

  // Get the best available user ID (Firebase Auth first, then persistent browser ID)
  const getUserId = () => {
    // Priority 1: Real Firebase Auth user
    if (firebaseUser?.uid) {
      console.log('✅ Using Firebase Auth user ID:', firebaseUser.uid);
      return firebaseUser.uid;
    }
    
    // Priority 2: Persistent browser ID for anonymous users
    try {
      if (typeof window === 'undefined') return 'guest';
      
      let userId = localStorage.getItem('persistentUserId');
      if (!userId) {
        // Create a unique ID for this browser
        userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('persistentUserId', userId);
        console.log('🆕 Created new persistent user ID:', userId);
      } else {
        console.log('🔄 Using existing persistent user ID:', userId);
      }
      return userId;
    } catch (error) {
      console.warn('Error getting persistent user ID:', error);
      return 'guest';
    }
  };


  const handleProductClick = async (id) => {
    // Save current page state and scroll position before navigating
    if (scrollManagerRef.current && pathname === '/') {
      // Save scroll position
      scrollManagerRef.current.savePosition('main');
      
      // Save page state to sessionStorage for restoration
      try {
        const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
        sessionStorage.setItem('featuredProducts_return', JSON.stringify({
          page: currentPage,
          scrollY,
          ts: Date.now()
        }));
      } catch (e) {
        console.warn('Could not save page state:', e);
      }
    }

    // Track product view for recent section
    const userId = getUserId();
    if (userId && userId !== 'guest') {
      console.log('👤 Tracking view for product:', id, 'User ID:', userId);
      try {
        await trackProductView(userId, id);
      } catch (error) {
        console.warn('Failed to track product view:', error);
      }
    } else {
      console.log('❌ No user ID available, skipping view tracking');
    }
    
    // Ensure the current URL has the correct page param BEFORE navigating (so Back returns to it)
    if (typeof window !== 'undefined' && pathname === '/') {
      const url = new URL(window.location.href);
      if (currentPage === 1) url.searchParams.delete('page');
      else url.searchParams.set('page', String(currentPage));
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }

    // Navigate to product detail page
    setIsNavigating(true);
    router.push(`/product/${id}`);
  };

  // Show skeleton while loading or when no products are loaded yet
  if (products.length === 0 && (loading || settingsLoading)) {
    return (
      <section className="bg-gray/70 pt-0 md:pt-3 pb-0 relative" data-featured-products>
        <div className="max-w-7xl mx-auto px-0">
          <div className="min-h-[2000px] md:min-h-[1500px]">
            <SkeletonLoader type="product-grid" />
          </div>
        </div>
      </section>
    );
  }

  // Show no products message only when we're sure there are no products
  if (products.length === 0 && !loading && !settingsLoading) {
    return (
      <div>
        <div className="bg-blue-50 text-blue-800 text-sm font-medium px-4 py-2 rounded-md text-center mb-4">
          {selectedCategory === "All Products" ? "ALL STARK ELECTRONICS" : (selectedCategory || "Products")}
        </div>
        <p className="text-center py-4">No similar products found.</p>
      </div>
    );
  }

  return (
    <section
      className="bg-gray/70 pt-0 md:pt-3 pb-0 relative"
      data-featured-products
      style={{ overflowAnchor: 'none' }}
    >
      {/* Anchor for reliable scroll-to-top of the products section (mobile-first) */}
      <div
        ref={productsTopRef}
        aria-hidden="true"
        style={{ height: 1, scrollMarginTop: getTopOffset(), overflowAnchor: 'none' }}
      />
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-blue-500 border-r-blue-500 border-b-blue-500 border-l-blue-500" />
        </div>
      )}
      
      {isPageChanging && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-md touch-none pointer-events-auto" 
          style={{ 
            WebkitBackdropFilter: 'blur(8px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          role="status"
          aria-live="polite"
          aria-label={`Loading page ${targetPageRef.current || currentPage}`}
        >
          <div className="flex flex-col items-center gap-3 px-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent" />
            <p className="text-gray-700 font-medium text-sm md:text-base">Loading page {targetPageRef.current || currentPage}...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-0">
        <div className="hidden md:block text-white text-sm font-semibold text-center uppercase mb-2">
          {selectedCategory === "All Products" ? "Stark Electronics" : (selectedCategory || "Similar Products")}
          {(keyword || name || manufacturer || (tags?.length > 0)) && (
            <span className="block text-xs text-gray-200">
              Filtered by:{" "}
              {[keyword, name, manufacturer, ...(tags || [])]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>

        {/* Desktop/Tablet: original grid */}
        <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0.5 p-0 m-0">
          {displayProducts.map(({ id, name, description, price, discount, imageUrl, sku }, index) => (
            <div key={id} onClick={() => handleProductClick(id)} className="cursor-pointer group scroll-mt-28">
              <ProductCard
                variant="compact"
                isFirst={index < 6} // First 6 products get priority loading
                badge={trendingProductIds.has(id) ? "Trending" : undefined}
                product={{
                  id,
                  name,
                  description,
                  sku,
                  price,
                  discount,
                  image: getPreferredImageUrl(imageUrl, featuredCardResolution),
                }}
              />
            </div>
          ))}
        </div>

        {/* Mobile: two rows after Trending, Recently Viewed, two rows, Latest, then remaining */}
        <div className="sm:hidden relative">
          {(() => {
            const firstCount = 4;
            const secondCount = 8;
            const first = displayProducts.slice(0, firstCount);
            const second = displayProducts.slice(firstCount, secondCount);
            const rest = displayProducts.slice(secondCount);
            return (
              <>
                {/* Two rows right after Trending */}
                <div className="grid grid-cols-2 gap-0.5 p-0 m-0">
                  {first.map(({ id, name, description, price, discount, imageUrl, sku }, index) => (
                    <div key={id} onClick={() => handleProductClick(id)} className="cursor-pointer group scroll-mt-28">
                      <ProductCard
                        variant="compact"
                        isFirst={index < 4} // First 4 products get priority loading on mobile
                        badge={trendingProductIds.has(id) ? "Trending" : undefined}
                        product={{
                          id,
                          name,
                          description,
                          sku,
                          price,
                          discount,
                          image: getPreferredImageUrl(imageUrl, featuredCardResolution),
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Recently Viewed Products - Embedded */}
                <div className="mt-1 mb-1">
                  <RecentlyViewedProducts 
                    limit={16} 
                    showTitle={true} 
                    onLoadComplete={() => setRecentlyViewedLoaded(true)}
                  />
                </div>

                {/* Two rows before Latest */}
                {second.length > 0 && (
                  <div className="grid grid-cols-2 gap-0.5 p-0 m-0">
                    {second.map(({ id, name, description, price, discount, imageUrl, sku }) => (
                      <div key={id} onClick={() => handleProductClick(id)} className="cursor-pointer group scroll-mt-28">
                        <ProductCard
                          variant="compact"
                          isFirst={false}
                          badge={trendingProductIds.has(id) ? "Trending" : undefined}
                          product={{
                            id,
                            name,
                            description,
                            sku,
                            price,
                            discount,
                            image: getPreferredImageUrl(imageUrl, featuredCardResolution),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Latest uploads horizontal scroller */}
                <div className="bg-white rounded-lg shadow p-4 mt-1 mb-1" style={{ minHeight: 196 }}>
                  <div className="flex items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Latest
                    </h2>
                  </div>
                  
                  {latestProducts.length > 0 ? (
                    <HorizontalScrollWithArrows scrollClassName="gap-4 no-scrollbar snap-x snap-mandatory pb-2" itemCount={latestProducts.length}>
                      {latestProducts.map(({ id, name, description, price, discount, imageUrl, sku }, index) => (
                        <div
                          key={`latest-${id}`}
                          className="snap-start shrink-0 w-32 cursor-pointer group"
                          onClick={() => handleProductClick(id)}
                        >
                          <div className="relative w-full h-32">
                            <Image
                              src={getPreferredImageUrl(imageUrl, featuredCardResolution)}
                              alt={name || 'Product'}
                              fill
                              sizes="128px"
                              fetchPriority="high"
                              className="object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute top-1.5 right-1.5 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              New
                            </div>
                          </div>
                          <div className="mt-2">
                            <h3 className="text-sm font-medium text-[#255cdc] line-clamp-2">
                              {formatProductName(name, settings)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              UGX {price?.toLocaleString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </HorizontalScrollWithArrows>
                  ) : (
                    <div className="text-center text-gray-400 text-xs py-2">
                      No latest products available
                    </div>
                  )}
                </div>

                {/* Remaining products */}
                <div className="grid grid-cols-2 gap-0.5 p-0 m-0">
                  {rest.map(({ id, name, description, price, discount, imageUrl, sku }, index) => (
                    <div id={`p-${id}`} key={`rest-${id}`} onClick={() => handleProductClick(id)} className="cursor-pointer group scroll-mt-28">
                      <ProductCard
                        variant="compact"
                        isFirst={index === 0}
                        badge={trendingProductIds.has(id) ? "Trending" : undefined}
                        product={{
                          id,
                          name,
                          description,
                          sku,
                          price,
                          discount,
                          image: getPreferredImageUrl(imageUrl, featuredCardResolution),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {loading && (
          <p className="text-center text-gray-600 py-4">Loading products...</p>
        )}
        
        {/* Pagination - Show if we have products and more than 1 page */}
        {!loading && allProducts.length > initialPageSize && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange}
          />
        )}
      </div>

    </section>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Search } from "lucide-react";
import Image from "next/image";
import { cacheUtils, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/cacheUtils";

// Helper function to get preferred image URL
const getPreferredImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  if (typeof imageUrl === "string") {
    try {
      return decodeURIComponent(imageUrl);
    } catch {
      return imageUrl;
    }
  }
  
  if (typeof imageUrl === "object") {
    const preferred = imageUrl["200x200"] || imageUrl["original"] || Object.values(imageUrl)[0];
    try {
      return decodeURIComponent(preferred);
    } catch {
      return preferred;
    }
  }
  
  return null;
};

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClickShieldActive, setIsClickShieldActive] = useState(false);
  const [isTouchScrolling, setIsTouchScrolling] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = "search-suggestions-listbox";
  const hideTimerRef = useRef(null);
  
  // Dynamic placeholder state
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const placeholderIntervalRef = useRef(null);

  const startAutoHide = (delayMs = 2000) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
      hideTimerRef.current = null;
    }, delayMs);
  };
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        
        // Check cache first with 5-minute expiration
        const cachedProducts = cacheUtils.getCache(CACHE_KEYS.SEARCH_PRODUCTS, CACHE_DURATIONS.SEARCH_PRODUCTS);
        
        if (cachedProducts) {
          setAllProducts(cachedProducts);
          setIsLoading(false);
          console.log('📦 Using cached search products:', cachedProducts.length);
          return;
        }
        
        const snapshot = await getDocs(collection(db, "products"));
        const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllProducts(products);
        
        // Cache the products with timestamp
        cacheUtils.setCache(CACHE_KEYS.SEARCH_PRODUCTS, products, CACHE_DURATIONS.SEARCH_PRODUCTS);
        
        console.log('📦 Fetched and cached search products:', products.length);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim();
    const handler = setTimeout(() => {
      if (term === "") {
        setSuggestions([]);
        setHighlightedIndex(-1);
      } else {
        const lowered = term.toLowerCase();
        const filtered = allProducts
          .filter((product) =>
            product.name?.toLowerCase().includes(lowered) ||
            product.description?.toLowerCase().includes(lowered) ||
            product.sku?.toLowerCase().includes(lowered) ||
            (Array.isArray(product.tags) && product.tags.some((t) => t?.toLowerCase().includes(lowered)))
          )
          .slice(0, 10);
        setSuggestions(filtered);
        setHighlightedIndex(filtered.length ? 0 : -1);
      }
    }, 150); // debounce
    return () => clearTimeout(handler);
  }, [searchTerm, allProducts]);

  // Dynamic placeholder effect
  useEffect(() => {
    // Create placeholder texts with product suggestions
    const basePlaceholder = "Search on HeloQuip";
    const productSuggestions = allProducts
      .slice(0, 3) // Take first 3 products
      .map(product => `Search for ${product.name}`)
      .filter(Boolean); // Remove any empty suggestions
    
    const allPlaceholders = [basePlaceholder, ...productSuggestions];
    
    // Only start cycling if we have products and user is not focused on search
    if (allPlaceholders.length > 1 && !isFocused && !searchTerm) {
      placeholderIntervalRef.current = setInterval(() => {
        setCurrentPlaceholderIndex((prevIndex) => 
          (prevIndex + 1) % allPlaceholders.length
        );
      }, 3000); // Change every 3 seconds
    } else {
      // Clear interval if user is focused or typing
      if (placeholderIntervalRef.current) {
        clearInterval(placeholderIntervalRef.current);
        placeholderIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (placeholderIntervalRef.current) {
        clearInterval(placeholderIntervalRef.current);
      }
    };
  }, [allProducts, isFocused, searchTerm]);

  // Get current dynamic placeholder
  const getCurrentPlaceholder = () => {
    const basePlaceholder = "Search electronics components...";
    const productSuggestions = allProducts
      .slice(0, 3)
      .map(product => `Search for ${product.name}`)
      .filter(Boolean);
    
    const allPlaceholders = [basePlaceholder, ...productSuggestions];
    return allPlaceholders[currentPlaceholderIndex] || basePlaceholder;
  };

  // Close suggestions only on navigation changes
  useEffect(() => {
    // When the route changes, hide suggestions
    setIsFocused(false);
    setSuggestions([]);
  }, [pathname]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSuggestionClick = (e, product) => {
    // Prevent input blur before we handle navigation
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

    setSearchTerm(product.name);
    // Activate a temporary shield to block underlying clicks
    setIsClickShieldActive(true);
    // Schedule auto-hide shortly after selection
    startAutoHide(2000);

    // Delay navigation by ~1s to avoid accidental underlying taps
    const target = `/search?q=${encodeURIComponent(product.name)}`;
    setTimeout(() => {
      router.push(target);
    }, 1000);

    // Remove shield shortly after navigation trigger
    setTimeout(() => {
      setIsClickShieldActive(false);
    }, 1100);
  };

  const handleSuggestionMouseDown = (e) => {
    // Prevent early selection on mousedown; we'll use click instead
    e.preventDefault();
  };

  const handleSuggestionClickSafe = (e, product) => {
    if (isTouchScrolling) return; // ignore if a scroll gesture was detected
    handleSuggestionClick(e, product);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setIsTouchScrolling(false);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    const distance = Math.max(dx, dy);
    if (distance > 8) {
      setIsTouchScrolling(true);
    }
  };

  const handleTouchEnd = (e, product) => {
    // If user was scrolling, do nothing
    if (isTouchScrolling) {
      setIsTouchScrolling(false);
      return;
    }
    handleSuggestionClick(e, product);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (e.target.value.trim() === "") {
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (!isFocused || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(e, suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      // Allow manual close with Escape
      setIsFocused(false);
      setSuggestions([]);
    }
  };

  return (
    <div className="relative w-full max-w-md md:max-w-2xl mx-auto mt-0" ref={searchRef}>
      {/* Click shield to prevent accidental taps on elements behind dropdown */}
      {isClickShieldActive && (
        <div className="fixed inset-0 z-[9999]" style={{ background: 'transparent' }}></div>
      )}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2" role="search">
        <div className="search-input-border-glow">
        <div className="search-input-inner relative">
        <input
          type="text"
          placeholder={getCurrentPlaceholder()}
            className="w-full pl-6 pr-12 md:pr-4 py-2 rounded focus:outline-none text-base transition-all duration-300"
            style={{ 
              background: '#FFFFFF',
              border: 'none',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => {
              setIsFocused(true);
            }}
            onBlur={(e) => {
              // Border is handled by wrapper CSS
            }}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isFocused && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${suggestions[highlightedIndex]?.id}` : undefined}
        />
          {/* Mobile: Icon button inside input */}
          <button 
            type="submit" 
            className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden transition-all" 
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.target.style.color = 'var(--accent-blue)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            aria-label="Search"
          >
          <Search className="w-4 h-4" />
          </button>
        </div>
        </div>
        {/* Desktop: Visible search button */}
        <button 
          type="submit" 
          className="hidden md:flex items-center gap-2 px-6 py-2 rounded-full transition-all font-medium text-base whitespace-nowrap btn-secondary" 
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
      </form>

      {/* Search Suggestions Dropdown */}
      {isFocused && searchTerm && suggestions.length > 0 && (
        <ul id={listboxId} role="listbox" className="absolute z-50 w-full rounded mt-2 max-h-80 overflow-y-auto search-suggestions bg-white" style={{ border: '1px solid #D5D9D9', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
          {suggestions.map((product, index) => (
            <li key={product.id} id={`suggestion-${product.id}`} role="option" aria-selected={index === highlightedIndex} className="p-0 last:border-b-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className={`w-full px-4 py-2.5 cursor-pointer transition-all text-left pointer-events-auto`}
                style={{ 
                  background: index === highlightedIndex ? '#F5F5F5' : 'transparent',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  if (index !== highlightedIndex) {
                    e.target.style.background = '#F5F5F5';
                    e.target.style.color = 'var(--accent-blue)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== highlightedIndex) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseDown={handleSuggestionMouseDown}
                onClick={(e) => handleSuggestionClickSafe(e, product)}
                onTouchEnd={(e) => handleTouchEnd(e, product)}
              >
                <div className="flex items-center space-x-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden search-suggestion-image bg-gray-100">
                    {(product.image || product.imageUrl) ? (
                      <Image
                        src={getPreferredImageUrl(product.image || product.imageUrl)}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover pointer-events-none"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {/* Fallback icon when no image */}
                    <div className="w-full h-full flex items-center justify-center text-xs bg-gray-100" style={{ display: (product.image || product.imageUrl) ? 'none' : 'flex', color: 'var(--text-muted)' }}>
                      ⚡
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: {product.sku}</p>
                    )}
                    {product.price && (
                      <p className="text-xs text-gray-500">UGX {product.price.toLocaleString()}</p>
                    )}
                    {product.description && (
                      <p className="text-xs text-gray-400 truncate">{product.description}</p>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </li>
          ))}
          
          {/* View All Results Link */}
          <li className="px-3 py-2 border-t border-gray-200 bg-gray-50 search-suggestion-item">
            <button
              onClick={handleSubmit}
              className="w-full text-center text-sm text-[#0865ff] hover:text-[#075ae6] font-medium py-1"
            >
              View all results for "{searchTerm}"
            </button>
          </li>
        </ul>
      )}

      {/* Loading State */}
      {isFocused && searchTerm && isLoading && (
        <div className="absolute z-50 bg-white w-full border border-gray-200 rounded-lg mt-1 shadow-lg p-4">
          <div className="flex items-center justify-center text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0865ff] mr-2"></div>
            Loading suggestions...
          </div>
        </div>
      )}
    </div>
  );
}

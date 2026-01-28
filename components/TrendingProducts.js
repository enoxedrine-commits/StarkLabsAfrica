"use client";

import Head from "next/head";
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProductCard from "@/components/ProductCard";
import { cacheUtils, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/cacheUtils";
import { useDisplaySettings } from "@/lib/useDisplaySettings";
import HorizontalScrollWithArrows from "@/components/HorizontalScrollWithArrows";


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
    const preferred =
      imageUrl["800x800"] ||
      imageUrl["680x680"] ||
      imageUrl["200x200"] ||
      imageUrl["original"] ||
      Object.values(imageUrl)[0];
    try {
      return decodeURIComponent(preferred);
    } catch {
      return preferred;
    }
  }
  return null;
};

export default function TrendingProducts({ onLoadComplete }) {
  const [products, setProducts] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const { carouselMode, carouselImages, loading: settingsLoading } = useDisplaySettings();
  const router = useRouter();
  const trackRef = useRef(null);
  
  useEffect(() => {
    if (settingsLoading) return;
    if (carouselMode === "images") {
      setLoading(false);
      if (onLoadComplete) onLoadComplete();
      return;
    }

    const fetchTrendingProducts = async () => {
      try {
        setLoading(true);
        console.log('🚀 Fetching trending products...');
        
        // Check cache first for faster loading
        const cachedProducts = cacheUtils.getCache(CACHE_KEYS.TRENDING_PRODUCTS, CACHE_DURATIONS.TRENDING_PRODUCTS);
        
        if (cachedProducts) {
          setProducts(cachedProducts);
          setLoading(false);
          console.log('📦 Using cached trending products:', cachedProducts.length);
          
          if (onLoadComplete) {
            onLoadComplete();
          }
          return;
        }
        
        // Fetch trending product IDs
        const q = query(collection(db, "trendingProducts"), limit(5));
        const snapshot = await getDocs(q);
        console.log('📊 Found trending docs:', snapshot.docs.length);

        if (snapshot.docs.length === 0) {
          setProducts([]);
          setLoading(false);
          if (onLoadComplete) onLoadComplete();
          return;
        }

        // Extract product IDs
        const productIds = snapshot.docs.map((doc) => {
          const data = doc.data();
          return data.productId || doc.id;
        });

        // Batch fetch all products at once (parallel instead of sequential)
        const productPromises = productIds.map(async (productId) => {
          try {
            const productRef = doc(db, "products", productId);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              const data = productSnap.data();
              return {
                id: productSnap.id,
                name: data.name || "Unnamed",
                image: getPreferredImageUrl(data.image || data.imageUrl),
                price: data.price || 0,
                description: data.description || "No description provided.",
                sku: data.sku || "N/A",
                manufacturer: data.manufacturer || "",
                discount: data.discount || 0,
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
            return null;
          }
        });

        const fullProducts = (await Promise.all(productPromises)).filter(Boolean);
        console.log('✅ Loaded trending products:', fullProducts.length);
        
        setProducts(fullProducts);
        
        // Cache the results for faster future loads
        cacheUtils.setCache(CACHE_KEYS.TRENDING_PRODUCTS, fullProducts, CACHE_DURATIONS.TRENDING_PRODUCTS);
        
        setLoading(false);
        
        if (onLoadComplete) {
          console.log('✅ TrendingProducts: Loading complete, calling onLoadComplete');
          onLoadComplete();
        }
        
      } catch (error) {
        console.error('Error fetching trending products:', error);
        setProducts([]);
        setLoading(false);
        
        if (onLoadComplete) {
          console.log('✅ TrendingProducts: Loading complete (error), calling onLoadComplete');
          onLoadComplete();
        }
      }
    };

    fetchTrendingProducts();
  }, [carouselMode, onLoadComplete, settingsLoading]);

  const imageSlides = useMemo(() => {
    return (carouselImages || []).map((image, index) => ({
      id: image.storagePath || image.url || `carousel-${index}`,
      url: image.url,
      alt: image.alt || `Carousel image ${index + 1}`,
      link: image.link || "",
    }));
  }, [carouselImages]);

  const totalSlides = carouselMode === "images" ? imageSlides.length : products.length;

  useEffect(() => {
    if (totalSlides === 0) return;
    setCurrentSlide(0);
  }, [totalSlides]);

  // Auto-slide logic
  useEffect(() => {
    if (totalSlides === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [totalSlides]);

  // Auto-scroll mobile carousel
  useEffect(() => {
    if (totalSlides === 0 || !trackRef.current) return;

    const scrollToSlide = () => {
      if (trackRef.current) {
        const slideWidth = trackRef.current.scrollWidth / totalSlides;
        trackRef.current.scrollTo({
          left: currentSlide * slideWidth,
          behavior: 'auto'
        });
      }
    };

    // Scroll immediately when currentSlide changes
    scrollToSlide();
  }, [currentSlide, totalSlides]);



  const handleProductClick = (productId) => {

    setIsNavigating(true);
    router.push(`/product/${productId}`);
  };

  if (loading || settingsLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="animate-pulse w-full">
          {/* Desktop trending skeleton - single large card */}
          <div className="hidden md:block">
            <div className="bg-gray-200 h-48 rounded-2xl"></div>
          </div>
          {/* Mobile trending skeleton - horizontal scroll */}
          <div className="block md:hidden">
            <div className="bg-gray-200 h-40 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (carouselMode === "images" && imageSlides.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No carousel images available
      </div>
    );
  }

  if (carouselMode !== "images" && products.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No trending products available
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Trending Products - HalloQuip</title>
        {/* Preload first trending product image for better LCP */}
        {carouselMode === "images" && imageSlides.length > 0 && (
          <link
            rel="preload"
            as="image"
            href={`/_next/image?url=${encodeURIComponent(imageSlides[0].url)}&w=680&q=75`}
            fetchPriority="high"
          />
        )}
        {carouselMode !== "images" && products.length > 0 && products[0]?.image && (
          <link
            rel="preload"
            as="image"
            href={`/_next/image?url=${encodeURIComponent(products[0].image)}&w=680&q=75`}
            fetchPriority="high"
          />
        )}
      </Head>

      {/* Desktop Slide Carousel - no padding so cards fill edge to edge */}
      <div className="hidden md:block h-full w-full min-h-0 flex items-center justify-center relative">
        <div className="w-full h-full min-h-0 relative">
          {carouselMode === "images" &&
            imageSlides.map((image, index) => (
              <div
                key={image.id}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {/* 712×384 aspect to match your image size – no cropping on desktop or mobile */}
                <div className={`w-full max-h-full aspect-[712/384] relative rounded-2xl overflow-hidden bg-gray-100 ${image.link ? "cursor-pointer" : ""}`}>
                  {image.url && (
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 680px, (min-width: 768px) 520px, 100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  )}
                  {image.link && (
                    <a
                      href={image.link}
                      target={image.link.startsWith("http") ? "_blank" : undefined}
                      rel={image.link.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label={image.alt}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (image.link.startsWith("http")) {
                          window.open(image.link, "_blank");
                        } else {
                          router.push(image.link);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          {carouselMode !== "images" &&
            products.map((product, index) => (
            <div
              key={product.id}
              className={`absolute inset-0 transition-opacity duration-300 ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              <div className="w-full h-full flex items-center" id={`trend-${product.id}`}>
                <ProductCard
                  product={product}
                  variant="carousel"
                  badge="Trending"
                  hideSKU={true}
                  isFirst={index === 0} // First trending product gets priority
                  onClick={() => handleProductClick(product.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Slide Carousel */}
      <div className="block md:hidden">
        <HorizontalScrollWithArrows
          forwardedRef={trackRef}
          scrollByFullWidth
          scrollClassName="snap-x snap-mandatory"
          itemCount={totalSlides}
        >
          {carouselMode === "images" &&
            imageSlides.map((image, index) => (
              <div key={image.id} className="flex-shrink-0 w-full snap-center">
                {/* 712×384 aspect to match your image size – no cropping */}
                <div className={`w-full aspect-[712/384] relative rounded-xl overflow-hidden bg-gray-100 ${image.link ? "cursor-pointer" : ""}`}>
                  {image.url && (
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  )}
                  {image.link && (
                    <a
                      href={image.link}
                      target={image.link.startsWith("http") ? "_blank" : undefined}
                      rel={image.link.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label={image.alt}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (image.link.startsWith("http")) {
                          window.open(image.link, "_blank");
                        } else {
                          router.push(image.link);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          {carouselMode !== "images" &&
            products.map((product, index) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-full snap-center"
              >
                <ProductCard
                  product={product}
                  variant="mobilecarousel"
                  badge="Trending"
                  hideSKU={true}
                  isFirst={index === 0} // First trending product gets priority
                  onClick={() => handleProductClick(product.id)}
                />
              </div>
            ))}
        </HorizontalScrollWithArrows>
      </div>
    </>
  );
}
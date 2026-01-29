"use client";

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { CustomerExperienceService } from '@/lib/customerExperienceService';
import { getProductImageUrl } from '@/lib/imageUtils';
import Link from 'next/link';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useProductSettings, formatProductName } from '@/hooks/useProductSettings';
import HorizontalScrollWithArrows from '@/components/HorizontalScrollWithArrows';

export default function RecentlyViewedProducts({ limit = 6, showTitle = true, title = "Recently Viewed", onLoadComplete }) {
  const [user, setUser] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useProductSettings();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecentlyViewed();
    } else {
      setLoading(false);
      if (onLoadComplete) {
        onLoadComplete();
      }
    }
  }, [user, onLoadComplete, limit]);

  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true);
      const items = await CustomerExperienceService.getRecentlyViewed(user.uid, limit);
      // Filter out any items that don't have valid product data
      const validItems = items.filter(item => 
        item.product && 
        (item.product.name || item.productName) && 
        (item.product.price !== undefined || item.productPrice !== undefined)
      );
      setRecentlyViewed(validItems);
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
      setRecentlyViewed([]);
    } finally {
      setLoading(false);
      if (onLoadComplete) {
        onLoadComplete();
      }
    }
  };

  const getImageUrl = (item) => {
    // Create a product-like object for the image utility
    const product = {
      imageUrl: item.product?.imageUrl || item.productImage
    };
    return getProductImageUrl(product, "200x200");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return null; // Don't show for non-authenticated users
  }

  if (loading) {
    // Lightweight fixed-height placeholder to avoid layout shift
    return (
      <div className="bg-white rounded-lg shadow p-4" style={{ minHeight: 160 }}>
        {showTitle && (
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            {title}
          </h2>
        )}
        <div className="flex gap-4">
          {Array.from({ length: Math.max(3, Math.min(6, limit)) }).map((_, index) => (
            <div key={index} className="w-32">
              <div className="bg-gray-200 h-32 rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentlyViewed.length === 0) {
    return null; // Don't show empty state
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {showTitle && (
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            {title}
          </h2>
        </div>
      )}
      
      <HorizontalScrollWithArrows scrollClassName="gap-4 no-scrollbar snap-x snap-mandatory pb-2" itemCount={recentlyViewed.length}>
        {recentlyViewed.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.productId}`}
            className="group block snap-start shrink-0 w-32"
          >
            <div className="relative">
              <img
                src={getImageUrl(item)}
                alt={item.product?.name || item.productName}
                className="w-full h-32 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
              />
              <div className="absolute top-1.5 right-1.5 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                {formatDate(item.viewedAt)}
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                {formatProductName(item.product?.name || item.productName || 'Product', settings)}
              </h3>
              <p className="text-sm text-gray-500">
                {item.product?.price !== undefined || item.productPrice !== undefined 
                  ? `UGX ${(item.product?.price || item.productPrice || 0).toLocaleString()}`
                  : 'Price unavailable'
                }
              </p>
            </div>
          </Link>
        ))}
      </HorizontalScrollWithArrows>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [displayCount, setDisplayCount] = useState(5);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

             let q = query(
         collection(db, "feedback"),
         where("status", "==", "approved"),
         where("allowPublicDisplay", "==", true),
         orderBy("createdAt", "desc"), // Sort by most recent first
         limit(isLoadMore ? 5 : displayCount)
       );

       if (isLoadMore && lastDoc) {
         q = query(
           collection(db, "feedback"),
           where("status", "==", "approved"),
           where("allowPublicDisplay", "==", true),
           orderBy("createdAt", "desc"),
           startAfter(lastDoc),
           limit(5)
         );
       }

      const querySnapshot = await getDocs(q);
      const testimonialsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      if (isLoadMore) {
        setTestimonials(prev => [...prev, ...testimonialsData]);
      } else {
        setTestimonials(testimonialsData);
      }

      // Update pagination state
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === (isLoadMore ? 5 : displayCount));
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      if (!isLoadMore) {
        setTestimonials([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchTestimonials(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return "AN";
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorClass = (name) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600", 
      "bg-purple-100 text-purple-600",
      "bg-orange-100 text-orange-600",
      "bg-pink-100 text-pink-600",
      "bg-indigo-100 text-indigo-600"
    ];
    // Use name hash for consistent colors per user
    const hash = name ? name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-6 animate-pulse">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="ml-3 flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-4/5"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

     if (testimonials.length === 0) {
     return (
       <div className="text-center py-8">
         <div className="bg-gray-50 rounded-xl p-8">
           <h3 className="text-lg font-semibold text-gray-800 mb-2">No testimonials yet</h3>
           <p className="text-gray-600 mb-4">
             Be the first to share your experience with StarkLabs!
           </p>
           <Link
             href="/feedback"
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
           >
             Share Your Experience
           </Link>
         </div>
       </div>
     );
   }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">What Our Customers Say</h2>
        <Link
          href="/feedback"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Share Your Experience →
        </Link>
      </div>
      
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
         {testimonials.map((testimonial) => (
           <div key={testimonial.id} className="bg-gray-50 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow">
             <div className="flex items-center mb-3 sm:mb-4">
               <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${getColorClass(testimonial.userName)}`}>
                 {getInitials(testimonial.userName)}
               </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-800 text-sm sm:text-base">
                  {testimonial.userName || "Anonymous"}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {testimonial.profession || "Customer"}
                </p>
              </div>
            </div>
            
            {/* Rating */}
            <div className="flex items-center mb-2 sm:mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    star <= testimonial.rating 
                      ? "text-yellow-400" 
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="ml-2 text-xs sm:text-sm text-gray-600">
                {testimonial.rating}/5
              </span>
            </div>
            
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              "{testimonial.testimonial}"
            </p>
            
            <div className="mt-3 sm:mt-4 text-xs text-gray-500">
              {testimonial.createdAt.toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Loading...
              </>
            ) : (
              `View More (${testimonials.length} shown)`
            )}
          </button>
        </div>
      )}

      {/* No more testimonials message */}
      {!hasMore && testimonials.length > 0 && (
        <div className="text-center pt-4">
          <p className="text-gray-500 text-sm">
            You've seen all available testimonials ({testimonials.length} total)
          </p>
        </div>
      )}
    </div>
  );
}

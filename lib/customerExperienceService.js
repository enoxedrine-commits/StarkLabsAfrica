// lib/customerExperienceService.js
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';

export class CustomerExperienceService {
  // ===== WISHLIST FUNCTIONALITY =====
  
  // Add item to wishlist
  static async addToWishlist(userId, product) {
    try {
      // Check if item already exists in wishlist
      const existingQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', userId),
        where('productId', '==', product.id)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        return { success: false, error: 'Item already in wishlist' };
      }

      const wishlistItem = {
        userId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.imageUrl,
        productSku: product.sku,
        productCategory: product.category,
        productManufacturer: product.manufacturer,
        addedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'wishlist'), wishlistItem);
      return { success: true };
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove item from wishlist
  static async removeFromWishlist(userId, productId) {
    try {
      const wishlistQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', userId),
        where('productId', '==', productId)
      );
      const snapshot = await getDocs(wishlistQuery);
      
      if (snapshot.empty) {
        return { success: false, error: 'Item not found in wishlist' };
      }

      await deleteDoc(snapshot.docs[0].ref);
      return { success: true };
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's wishlist
  static async getUserWishlist(userId) {
    try {
      const wishlistQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', userId),
        orderBy('addedAt', 'desc')
      );
      const snapshot = await getDocs(wishlistQuery);
      
      const wishlistItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enrich with current product data
      const enrichedWishlist = await Promise.all(
        wishlistItems.map(async (item) => {
          try {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              return {
                ...item,
                product: {
                  id: productSnap.id,
                  ...productSnap.data()
                }
              };
            }
            return item;
          } catch (error) {
            console.error('Error enriching wishlist data:', error);
            return item;
          }
        })
      );

      return enrichedWishlist;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  }

  // Check if item is in wishlist
  static async isInWishlist(userId, productId) {
    try {
      const wishlistQuery = query(
        collection(db, 'wishlist'),
        where('userId', '==', userId),
        where('productId', '==', productId)
      );
      const snapshot = await getDocs(wishlistQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }

  // ===== RECENTLY VIEWED PRODUCTS =====
  
  // Track product view (enhanced version of existing)
  static async trackProductView(userId, productId, productData = null) {
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
        const viewData = {
          userId,
          productId,
          viewedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          viewCount: 1
        };

        // Add product data if available for better recommendations
        if (productData) {
          viewData.productName = productData.name;
          viewData.productCategory = productData.category;
          viewData.productPrice = productData.price;
          viewData.productImage = productData.imageUrl; // Store the full image object/URL
          viewData.productManufacturer = productData.manufacturer;
          viewData.productSku = productData.sku;
        }

        const docRef = await addDoc(collection(db, "recentViews"), viewData);
        console.log('✅ Created new view record:', docRef.id);
      } else {
        // Update existing view record with new timestamp and increment count
        const viewDoc = existingViews.docs[0];
        await updateDoc(doc(db, "recentViews", viewDoc.id), {
          viewedAt: serverTimestamp(),
          viewCount: increment(1)
        });
        console.log('🔄 Updated existing view record:', viewDoc.id);
      }
    } catch (error) {
      console.error('❌ Error tracking product view:', error);
    }
  }

  // Get recently viewed products for a user
  static async getRecentlyViewed(userId, limitCount = 10) {
    try {
      const recentViewsQuery = query(
        collection(db, "recentViews"),
        where("userId", "==", userId),
        orderBy("viewedAt", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(recentViewsQuery);
      const recentViews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Enrich with current product data and filter out deleted products
      const enrichedViews = await Promise.all(
        recentViews.map(async (view) => {
          try {
            const productRef = doc(db, 'products', view.productId);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              const productData = productSnap.data();
              // Only return if product has valid data
              if (productData.name || productData.price !== undefined) {
                return {
                  ...view,
                  product: {
                    id: productSnap.id,
                    ...productData
                  }
                };
              }
            }
            // Product doesn't exist or has invalid data - return null to filter it out
            return null;
          } catch (error) {
            console.error('Error enriching view data:', error);
            return null; // Filter out items with errors
          }
        })
      );

      // Filter out null values (deleted/invalid products) and return only valid items
      const validViews = enrichedViews.filter(item => item !== null && item.product);
      
      // Optional: Clean up stale entries for deleted products (only if we have valid views)
      // This prevents the list from growing indefinitely with deleted products
      if (validViews.length < recentViews.length) {
        const deletedProductIds = recentViews
          .filter(view => !validViews.find(v => v.id === view.id))
          .map(view => view.id);
        
        // Clean up stale entries in the background (don't await)
        if (deletedProductIds.length > 0) {
          Promise.all(
            deletedProductIds.map(viewId => {
              const viewRef = doc(db, 'recentViews', viewId);
              return deleteDoc(viewRef).catch(err => {
                console.warn('Failed to clean up stale recentView:', err);
              });
            })
          ).catch(err => {
            console.warn('Error cleaning up stale recentViews:', err);
          });
        }
      }
      
      return validViews;
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
      return [];
    }
  }

  // ===== PRODUCT COMPARISON =====
  
  // Add product to comparison list
  static async addToComparison(userId, productId) {
    try {
      // Check if comparison list exists for user
      const comparisonRef = doc(db, 'productComparisons', userId);
      const comparisonSnap = await getDoc(comparisonRef);
      
      let comparisonData = comparisonSnap.exists() ? comparisonSnap.data() : { products: [] };
      
      // Check if product is already in comparison
      if (comparisonData.products.includes(productId)) {
        return { success: false, error: 'Product already in comparison' };
      }
      
      // Limit to 4 products max
      if (comparisonData.products.length >= 4) {
        return { success: false, error: 'Maximum 4 products can be compared' };
      }
      
      // Add product to comparison
      comparisonData.products.push(productId);
      comparisonData.updatedAt = serverTimestamp();
      
      if (!comparisonSnap.exists()) {
        comparisonData.createdAt = serverTimestamp();
      }
      
      await setDoc(comparisonRef, comparisonData);
      return { success: true };
    } catch (error) {
      console.error('Error adding to comparison:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove product from comparison
  static async removeFromComparison(userId, productId) {
    try {
      const comparisonRef = doc(db, 'productComparisons', userId);
      const comparisonSnap = await getDoc(comparisonRef);
      
      if (!comparisonSnap.exists()) {
        return { success: false, error: 'No comparison list found' };
      }
      
      const comparisonData = comparisonSnap.data();
      const updatedProducts = comparisonData.products.filter(id => id !== productId);
      
      await updateDoc(comparisonRef, {
        products: updatedProducts,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from comparison:', error);
      return { success: false, error: error.message };
    }
  }

  // Get comparison list for user
  static async getComparisonList(userId) {
    try {
      const comparisonRef = doc(db, 'productComparisons', userId);
      const comparisonSnap = await getDoc(comparisonRef);
      
      if (!comparisonSnap.exists()) {
        return { products: [] };
      }
      
      const comparisonData = comparisonSnap.data();
      
      // Enrich with product data
      const enrichedProducts = await Promise.all(
        comparisonData.products.map(async (productId) => {
          try {
            const productRef = doc(db, 'products', productId);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              return {
                id: productSnap.id,
                ...productSnap.data()
              };
            }
            return null;
          } catch (error) {
            console.error('Error fetching product for comparison:', error);
            return null;
          }
        })
      );
      
      return {
        ...comparisonData,
        products: enrichedProducts.filter(Boolean)
      };
    } catch (error) {
      console.error('Error fetching comparison list:', error);
      return { products: [] };
    }
  }

  // ===== PRODUCT RECOMMENDATIONS =====
  
  // Get personalized recommendations based on viewing history
  static async getPersonalizedRecommendations(userId, limitCount = 3) {
    try {
      // Get user's recent views
      const recentViews = await this.getRecentlyViewed(userId, 20);
      
      if (recentViews.length === 0) {
        // If no viewing history, return popular products
        return await this.getPopularProducts(limitCount);
      }
      
      // Extract categories and manufacturers from viewed products
      const viewedCategories = new Set();
      const viewedManufacturers = new Set();
      const viewedProductIds = new Set();
      
      recentViews.forEach(view => {
        if (view.productCategory) viewedCategories.add(view.productCategory);
        if (view.productManufacturer) viewedManufacturers.add(view.productManufacturer);
        viewedProductIds.add(view.productId);
      });
      
      // Get products from similar categories and manufacturers
      const recommendations = [];
      
      // Query products from viewed categories
      for (const category of viewedCategories) {
        const categoryQuery = query(
          collection(db, 'products'),
          where('category', '==', category),
          where('status', '==', 'active'),
          limit(5)
        );
        
        const categorySnapshot = await getDocs(categoryQuery);
        categorySnapshot.docs.forEach(doc => {
          if (!viewedProductIds.has(doc.id)) {
            recommendations.push({
              id: doc.id,
              ...doc.data(),
              recommendationReason: 'Similar category'
            });
          }
        });
      }
      
      // Query products from viewed manufacturers
      for (const manufacturer of viewedManufacturers) {
        const manufacturerQuery = query(
          collection(db, 'products'),
          where('manufacturer', '==', manufacturer),
          where('status', '==', 'active'),
          limit(3)
        );
        
        const manufacturerSnapshot = await getDocs(manufacturerQuery);
        manufacturerSnapshot.docs.forEach(doc => {
          if (!viewedProductIds.has(doc.id)) {
            recommendations.push({
              id: doc.id,
              ...doc.data(),
              recommendationReason: 'Same manufacturer'
            });
          }
        });
      }
      
      // Remove duplicates and limit results
      const uniqueRecommendations = recommendations.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      
      return uniqueRecommendations.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return await this.getPopularProducts(limitCount);
    }
  }

  // Get popular products (fallback for new users)
  static async getPopularProducts(limitCount = 3) {
    try {
      console.log('🔍 Fetching popular products from trendingProducts collection...');
      
      // First try to get from trendingProducts collection
      const trendingQuery = query(
        collection(db, 'trendingProducts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const trendingSnapshot = await getDocs(trendingQuery);
      console.log('📊 Trending products found:', trendingSnapshot.docs.length);
      
      if (trendingSnapshot.docs.length > 0) {
        const trendingProducts = trendingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Enrich with current product data
        const enrichedProducts = await Promise.all(
          trendingProducts.map(async (trending) => {
            try {
              const productRef = doc(db, 'products', trending.productId);
              const productSnap = await getDoc(productRef);
              
              if (productSnap.exists()) {
                return {
                  id: productSnap.id,
                  ...productSnap.data(),
                  recommendationReason: 'Popular product'
                };
              }
              return null;
            } catch (error) {
              console.error('Error enriching trending product:', error);
              return null;
            }
          })
        );
        
        const validProducts = enrichedProducts.filter(Boolean);
        console.log('✅ Valid trending products:', validProducts.length);
        return validProducts;
      }
      
      // Fallback: Get featured products from main products collection
      console.log('🔄 No trending products found, falling back to featured products...');
      const featuredQuery = query(
        collection(db, 'products'),
        where('isFeatured', '==', true),
        where('status', '==', 'active'),
        limit(limitCount)
      );
      
      const featuredSnapshot = await getDocs(featuredQuery);
      console.log('📊 Featured products found:', featuredSnapshot.docs.length);
      
      if (featuredSnapshot.docs.length > 0) {
        return featuredSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          recommendationReason: 'Featured product'
        }));
      }
      
      // Final fallback: Get any active products
      console.log('🔄 No featured products found, getting any active products...');
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        limit(limitCount)
      );
      
      const productsSnapshot = await getDocs(productsQuery);
      console.log('📊 Active products found:', productsSnapshot.docs.length);
      
      return productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recommendationReason: 'Available product'
      }));
      
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  }

  // ===== CUSTOMER DASHBOARD DATA =====
  
  // Get comprehensive dashboard data for a customer
  static async getCustomerDashboardData(userId) {
    try {
      const [
        recentOrders,
        wishlistItems,
        recentlyViewed,
        comparisonList
      ] = await Promise.all([
        this.getRecentOrders(userId),
        this.getUserWishlist(userId),
        this.getRecentlyViewed(userId, 5),
        this.getComparisonList(userId)
      ]);
      
      return {
        recentOrders,
        wishlistItems,
        recentlyViewed,
        comparisonList,
        stats: {
          totalOrders: recentOrders.length,
          wishlistCount: wishlistItems.length,
          recentlyViewedCount: recentlyViewed.length,
          comparisonCount: comparisonList.products.length
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        recentOrders: [],
        wishlistItems: [],
        recentlyViewed: [],
        comparisonList: { products: [] },
        stats: {
          totalOrders: 0,
          wishlistCount: 0,
          recentlyViewedCount: 0,
          comparisonCount: 0
        }
      };
    }
  }

  // Get recent orders for customer
  static async getRecentOrders(userId, limitCount = 5) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }
}

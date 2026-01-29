"use client";

import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import ImageGallery from "@/components/ImageGallery";
import QuantityInput from "@/components/QuantityInput";
import RelatedProducts from "@/components/RelatedProducts";
import ContactButtons from "@/components/ContactButtons";
import WishlistButton from "@/components/WishlistButton";
import ProductComparisonButton from "@/components/ProductComparisonButton";
import CurrencyDropdown from "@/components/CurrencyDropdown";
import { CustomerExperienceService } from "@/lib/customerExperienceService";
import { useCurrency } from "@/hooks/useCurrency";

export default function ProductDetail() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { formatPrice, currency } = useCurrency();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project-id.firebasestorage.app';
  const fallbackImage = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/placeholder.jpg?alt=media&token=7b4e6ab8-7a01-468c-b5f7-a19d31290045`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Handle back navigation - preserve page state
  useEffect(() => {
    // Save the fromPage parameter if it exists for proper back navigation
    const fromPage = searchParams.get('fromPage');
    if (fromPage && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('featuredProducts_page', fromPage);
      } catch (e) {
        console.warn('Could not save fromPage:', e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };

          // ✅ Defensive fallback image logic - only use fallback for main image if missing
          data.imageUrl = data.imageUrl || fallbackImage;
          // Don't add fallback to extraImageUrls - only include actual extra images
          data.extraImageUrls =
            Array.isArray(data.extraImageUrls) && data.extraImageUrls.length > 0
              ? data.extraImageUrls.filter(img => {
                  if (!img) return false;
                  if (typeof img === 'string') {
                    return img.trim().length > 0;
                  }
                  // For object URLs, check if they have valid values
                  if (typeof img === 'object') {
                    const values = Object.values(img);
                    return values.some(val => val && typeof val === 'string' && val.trim().length > 0);
                  }
                  return true;
                })
              : [];

          setProduct(data);
          setActiveImage(data.imageUrl);
          setError(null);
        } else {
          setProduct(null);
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Failed to load product:", err);
        setError("Failed to load product. Please retry.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Increment weekly view count when product is loaded
  useEffect(() => {
    if (!product?.id) return;
    const recordView = async () => {
      try {
        const now = new Date();
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const day = d.getUTCDay(); // 0=Sun..6=Sat
        const diffToMonday = (day === 0 ? -6 : 1) - day; // move to Monday
        d.setUTCDate(d.getUTCDate() + diffToMonday);
        const weekKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; // YYYY-MM-DD (Monday)

        const weekDocRef = doc(db, "productViews", product.id, "weeks", weekKey);
        await setDoc(
          weekDocRef,
          { count: increment(1), weekStart: weekKey, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (e) {
        // best effort; ignore errors
      }
    };
    recordView();
  }, [product?.id]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      // Track product view when user is available and product is loaded
      if (user && product) {
        CustomerExperienceService.trackProductView(user.uid, product.id, product);
      }
    });
    return () => unsubscribe();
  }, [product]);

  // (Reverted) No auto-add on return; just return to the product page

  const handleAddToOrder = async () => {
    if (!user) {
      router.push(`/register?redirect=/product/${product.id}`);
      return;
    }

    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    try {
      const itemRef = doc(db, "carts", user.uid, "items", product.id);
      const itemSnap = await getDoc(itemRef);

      if (itemSnap.exists()) {
        toast.info("This product is already in your cart.");
        return;
      }

      await setDoc(itemRef, {
        ...product,
        quantity,
        addedAt: serverTimestamp(),
      });

      toast.success("Product added to your cart!");
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      toast.error("Failed to add to cart. Please try again.");
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push(`/register?redirect=/order?productId=${product.id}`);
    } else {
      router.push(`/order?productId=${product.id}`);
    }
  };

  if (loading) return <p className="text-center py-6">Loading...</p>;
  if (error) return <p className="text-center py-6 text-red-600">{error}</p>;
  if (!product) return <p className="text-center py-6">Product not found.</p>;

  // Normalize attributes so we can render array, map, or object formats
  const normalizedAttributes = Array.isArray(product.attributes)
    ? product.attributes
    : product.attributes && typeof product.attributes === "object"
      ? Object.entries(product.attributes).map(([name, value]) => ({
          name,
          description: typeof value === "string" ? value : String(value ?? ""),
        }))
      : [];

  // Filter out empty, null, undefined, or invalid image URLs
  const allImages = [
    product.imageUrl,
    ...(product.extraImageUrls || [])
  ].filter(img => {
    if (!img) return false;
    
    // Filter out empty strings, whitespace-only strings
    if (typeof img === 'string') {
      const trimmed = img.trim();
      // Keep the image if it's not empty and not just whitespace
      return trimmed.length > 0;
    }
    
    // For object URLs (multiple sizes), check if they have valid values
    if (typeof img === 'object') {
      const values = Object.values(img);
      return values.some(val => {
        if (!val) return false;
        if (typeof val === 'string') {
          return val.trim().length > 0;
        }
        return true;
      });
    }
    
    return true;
  });

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingTop: '88px' }}>
      {/* 3-column product block (desktop) / stacked (mobile) */}
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:grid gap-4 md:gap-6 md:grid-cols-[1fr_1.7fr_0.85fr]">
          {/* Col 1: Image Gallery */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <ImageGallery
              images={allImages}
              activeImage={activeImage}
              onSelect={setActiveImage}
            />
          </div>

          {/* Col 2: Name, SKU, CODE, Description, Additional, Attributes, Need Help */}
          <div className="md:col-span-1 product-detail-cards">
            <div className="w-full flex flex-col gap-2">
              {/* Product Name & Details (no price) */}
              <div className="p-4 rounded-md card">
                <p className="text-xl font-semibold truncate mb-2" style={{ color: 'var(--text-primary)' }}>
                  {product.name || 'Unnamed Product'}
                </p>
                <p className="text-[14px] mb-1" style={{ color: 'var(--text-muted)' }}>SKU: {product.sku}</p>
                <p className="text-[11px] break-words" style={{ color: 'var(--text-muted)' }}>CODE: {product.productCode}</p>
              </div>

              {/* Description */}
              <div className="p-4 rounded-md card">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Product Description</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {product.description || "No description provided for this product."}
                </p>
              </div>

              {/* Additional Details */}
              {product.warranty && (
                <div className="p-4 rounded-md card">
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Additional Details</h3>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Warranty</span>
                      <span className="text-right">{product.warranty}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attributes */}
              {normalizedAttributes.length > 0 && (
                <div className="p-4 rounded-md card">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Product Attributes</h3>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    {normalizedAttributes.map((attr, index) => (
                      <li key={index} className="flex justify-between">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{attr.name}:</span>
                        <span>{attr.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact */}
              <div className="p-4 rounded-md card">
                <h3 className="text-sm font-semibold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>Need Help?</h3>
                <ContactButtons phoneNumber="+256700000000" />
              </div>
            </div>
          </div>

          {/* Col 3: Price, Quantity, Add to Cart, View Orders — single card */}
          <div className="md:col-span-1">
            <div className="w-full flex flex-col gap-3 md:border md:border-gray-200 md:rounded-lg md:p-3">
              {/* Price */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-lg font-bold text-black">
                  {formatPrice(product.discount > 0
                    ? product.price * (1 - product.discount / 100)
                    : product.price
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {product.discount > 0 && (
                    <span className="line-through text-[15px]" style={{ color: 'var(--text-muted)' }}>
                      {formatPrice(product.price)}
                    </span>
                  )}
                  {product.discount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-semibold px-1 py-1 rounded-[10px]">
                      {`${product.discount}%`}
                    </span>
                  )}
                  <CurrencyDropdown />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Select Quantity</h3>
                <QuantityInput quantity={quantity} setQuantity={setQuantity} />
              </div>

              {/* Wishlist & Compare */}
              <div className="flex justify-center gap-4">
                <WishlistButton product={product} size="large" />
                <ProductComparisonButton product={product} size="large" />
              </div>

              {/* Add to Cart, View Orders */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={handleAddToOrder}
                  className="flex-1 px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 btn-primary"
                >
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200 btn-secondary"
                >
                  View Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Related Products */}
      <div className="w-full pt-6 pb-12">
        <h3 className="text-center text-sm font-medium mb-1 px-4" style={{ color: 'var(--text-secondary)' }}>
          Products related to
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}> {product.name} </span>
        </h3>
        <RelatedProducts
          selectedCategory={product?.category}
          keyword={product.name?.split(" ").slice(0, 2).join(" ").toLowerCase()}
          name={product.name}
          manufacturer={product?.manufacturer}
          tags={product?.tags}
          excludeId={product.id}
          cardVariant="compact"
        />
      </div>
    </div>
  );
}



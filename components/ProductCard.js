import React, { useState } from 'react';
import Image from 'next/image';
import WishlistButton from './WishlistButton';
import ProductComparisonButton from './ProductComparisonButton';
import { useProductSettings, formatProductName, shouldShowMOQ, shouldShowSKU } from '@/hooks/useProductSettings';

const ProductCard = ({ badge, product, variant = 'default', isFirst = false, largeDesktop = false, onClick, customResolution, hideSKU = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { settings } = useProductSettings();

  // Helper hey bro function to get the appropriate image URL based on variant and size
  const getImageUrl = (product, variant) => {
    // If imageUrl is an object with resized URLs (new format)
    if (product.imageUrl && typeof product.imageUrl === 'object') {
      // Choose the best size based on variant
      switch (variant) {
        case 'carousel':
        case 'landscapemain02':
          return product.imageUrl['680x680']; // || product.imageUrl.original;
        case 'mobilecarousel':
          return product.imageUrl['200x200'] || product.imageUrl['100x100'] || product.imageUrl.original;
        case 'compact':
          if (customResolution && product.imageUrl[customResolution]) {
            return product.imageUrl[customResolution];
          }
          return product.imageUrl['100x100'] || product.imageUrl['90x90'] || product.imageUrl.original;
        default:
          return product.imageUrl['680x680'] || product.imageUrl['200x200'] || product.imageUrl.original;
      }
    }
    
    // Fallback to old format or other image fields
    return product.imageUrl || product.image || product.mainImage || product.extraImages?.[0] || "/fallback.jpg";
  };

  const imageUrl = getImageUrl(product, variant);

  const commonClasses = 'card transition-all duration-300';
  const softShadow = 'shadow-[0_4px_12px_rgba(0,0,0,0.05)]';
  const productCodeText = product.sku || 'N/A';

  const discount = product.discount || 0;
  const originalPrice = Number(product.price || 0);
  const discountedPrice = discount > 0
    ? Math.round(originalPrice - (originalPrice * discount) / 100)
    : originalPrice;

  // Centralized image props for Next.js Image component
  const imageProps = {
    src: imageUrl || '/fallback.jpg',
    alt: formatProductName(product.name, settings) || 'Product',
    priority: isFirst, // Use priority instead of loading="eager" for Next.js Image
    fetchPriority: 'high', // High fetch priority for all product images
    onLoad: () => setImageLoaded(true),
    onError: () => setImageLoaded(true), // Avoid skeleton staying forever
    unoptimized: imageUrl?.startsWith('data:') || false, // Don't optimize data URLs or SVGs
  };

  const renderDefault = () => (
    <div className={`${commonClasses} p-4 relative`}>
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <WishlistButton product={product} size="small" />
        <ProductComparisonButton product={product} size="small" />
      </div>
      
      <div className="relative w-full h-48 mb-3">
        <Image {...imageProps} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover rounded-xl" />
      </div>
      <h2 className="hidden md:block text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{formatProductName(product.name, settings)}</h2>
      <p className="text-sm italic mb-1" style={{ color: 'var(--text-muted)' }}>{product.chipType || product.boardType || 'Component'}</p>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{product.voltage || product.specs || ''}</p>
      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
      <p className="font-bold mt-2 text-[#B12704]">UGX {discountedPrice.toLocaleString()}</p>
    </div>
  );

  const renderLandscape = () => (
    <div className={`${commonClasses} p-4 flex gap-4 items-center`}>
      <div className="relative w-32 h-32 flex-shrink-0">
        <Image {...imageProps} fill sizes="128px" className="object-cover rounded-xl" />
      </div>
      <div>
        <h2 className="hidden md:block text-lg font-semibold">{formatProductName(product.name, settings)}</h2>
        <p className="text-sm text-gray-400 italic mb-1">CODE: {productCodeText}</p>
        <p className="text-gray-600 mt-1 line-clamp-2">{product.description}</p>
        <p className="text-[#B12704] font-bold mt-2">UGX {discountedPrice.toLocaleString()}</p>
      </div>
    </div>
  );

  const renderLandscapeMain = () => (
    <div className={`rounded-3xl overflow-hidden transition flex w-full max-w-2xl mx-auto mb-3 card`}>
      <div className="relative w-32 sm:w-40 h-32 sm:h-40 flex-shrink-0 bg-gray-50">
        <Image {...imageProps} fill sizes="(max-width: 640px) 128px, 160px" className="object-cover rounded-l-2xl" />
      </div>
      <div className="flex flex-col justify-between p-4 w-full">
        <div>
          <h3 className="hidden md:block text-sm sm:text-base font-medium text-gray-800 line-clamp-2">{formatProductName(product.name, settings)}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description || 'No description available'}</p>
        </div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-sm text-gray-900 font-semibold">
              UGX {discountedPrice.toLocaleString()}
            </p>
            {shouldShowMOQ(settings) && (
              <p className="text-[11px] text-gray-500">1 item (MOQ)</p>
            )}
          </div>
          <p className="text-[12px] text-gray-400 italic">
            CODE: {product.sku}
          </p>
        </div>
      </div>
    </div>
  );

  const renderLandscapeMain02 = () => (
    <div className={`relative rounded-3xl overflow-hidden transition flex w-full ${largeDesktop ? 'max-w-5xl md:h-72' : 'w-full'} mx-auto card`}>
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-2 left-2 z-10 text-white text-xs font-medium px-2.5 py-0.5 rounded-full shadow-sm btn-primary" style={{ fontSize: '0.75rem' }}>
          {badge}
        </div>
      )}

      <div className={`relative ${largeDesktop ? 'w-96 h-80 md:w-[500px] md:h-96' : 'w-48 sm:w-52 h-48 sm:h-52'} flex-shrink-0 bg-gray-50`}>
        <Image {...imageProps} fill sizes={largeDesktop ? "(max-width: 768px) 384px, 500px" : "(max-width: 640px) 192px, 208px"} className="object-cover rounded-l-2xl" />
      </div>

      <div className={`flex flex-col justify-between ${largeDesktop ? 'p-8' : 'p-5'} w-full`}>
        <div>
          <h3 className={`hidden md:block text-[18px] sm:text-base font-semibold text-gray-800 line-clamp-2 ${largeDesktop ? 'md:text-2xl' : ''}`}>
            {formatProductName(product.name, settings)}
          </h3>
          {/* <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {product.description || 'No description available'}
          </p> */}
          {shouldShowSKU(settings) && (
            <p className="text-[12px] text-gray-500 italic">
              SKU: {product.sku}
            </p>
          )}

          <div className="mt-2">
            <p className={`text-sm text-gray-900 font-semibold ${largeDesktop ? 'md:text-xl' : ''}`}>
              UGX {discountedPrice.toLocaleString()}
            </p>
            <p className={`text-xs text-gray-500 ${largeDesktop ? 'md:text-base' : ''}`}>1 item (MOQ)</p>
          </div>

        </div>

      </div>
    </div>
  );

  const renderCarousel = () => (
    <div 
      className={`relative rounded-2xl overflow-hidden transition flex w-full h-full max-w-5xl mx-auto cursor-pointer card`}
      style={{ maxHeight: '100%', height: '100%' }}
      onClick={onClick}
    >
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-4 left-4 z-10 bg-[#FF9900] text-white text-xs font-medium px-2.5 py-0.5 rounded shadow-sm">
          {badge}
        </div>
      )}

      {/* Product image */}
      <div className="relative w-80 h-full bg-gray-50 flex-shrink-0 overflow-hidden">
        <Image {...imageProps} fill sizes="320px" className="object-cover rounded-l-2xl" />
      </div>

      {/* Content: name (uppercase), description, price - centered vertically */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 w-full min-h-0">
        <div className="w-full">
          {product.name && (
            <h3 className="text-2xl font-normal text-gray-800 line-clamp-2 mb-2">
              {product.name}
            </h3>
          )}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
              {product.description}
            </p>
          )}
          <p className="text-lg text-gray-900 font-bold">
            UGX {discountedPrice.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderMobileCarousel = () => (
    <div 
      className={`relative rounded-2xl overflow-hidden transition flex w-full cursor-pointer card`}
      onClick={onClick}
    >
      
      {/* Product image */}
      <div className="relative w-52 h-44 flex-shrink-0 overflow-hidden">
        <Image {...imageProps} fill sizes="208px" className="object-cover" style={{ objectPosition: 'center', transform: 'scale(0.99)' }} />
        
        {/* Trending Badge on Image */}
        {badge && (
          <div className="absolute top-2 left-2 z-10 bg-[#FF9900] text-white text-xs font-medium px-2 py-1 rounded shadow-sm">
            {badge}
          </div>
        )}
      </div>

      {/* Content: name (uppercase), description, price - centered vertically */}
      <div className="flex flex-1 flex-col justify-center min-h-[11rem] pl-3 pr-3 py-4">
        <div>
          {product.name && (
            <h3 className="text-lg font-normal text-gray-800 line-clamp-2">
              {product.name}
            </h3>
          )}
          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
          <p className="text-sm text-gray-900 font-bold mt-2">
            UGX {discountedPrice.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderPortrait = () => (
    <div className={`${commonClasses} p-4 w-48`}>
      <div className="relative w-full h-56 mb-3">
        <Image {...imageProps} fill sizes="192px" className="object-cover rounded-xl" />
      </div>
      <h2 className="hidden md:block text-base font-semibold">{formatProductName(product.name, settings)}</h2>
      <p className="text-[7px] text-gray-400 italic mb-1">CODE: {productCodeText}</p>
      <p className="text-gray-500 text-sm mt-1 line-clamp-3">{product.description}</p>
        <p className="text-[#B12704] font-bold mt-2 text-sm">UGX {discountedPrice.toLocaleString()}</p>
    </div>
  );

  const renderCompact = () => (
         <div 
           className={`p-0 w-full mx-auto transition break-inside-avoid rounded-3xl cursor-pointer card`}
           onClick={onClick}
         >
           <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '5 / 6' }}>
             {/* Skeleton placeholder with exact same dimensions */}
             {!imageLoaded && (
               <div className="absolute inset-0 animate-pulse rounded-2xl skeleton-bg" style={{ aspectRatio: '5 / 6' }} />
             )}

             {/* Badges */}
             <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
               {/* Discount Badge */}
               {discount > 0 && (
                 <div className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                   {discount}% Discount
                 </div>
               )}
               
               {/* Trending Badge */}
               {badge && (
                 <div className="bg-[#FF9900] text-white text-xs font-medium px-2 py-1 rounded shadow-sm">
                   {badge}
                 </div>
               )}
             </div>

             <Image 
               {...imageProps} 
               fill 
               sizes="(max-width: 640px) 50vw, 200px" 
               className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-2xl" 
               style={{ objectPosition: 'center' }}
               onLoad={() => setImageLoaded(true)}
               onError={() => setImageLoaded(true)}
             />
           </div>

                                                                                                                                                                       <div className="px-0 text-center">
                               <p
                className="text-sm font-medium text-gray-800 mb-0.5 truncate pt-2"
                title={formatProductName(product.name, settings)}
              >
                {formatProductName(product.name, settings)}
              </p>

              <p className="text-sm text-[#B12704] font-semibold mb-0.5">
                UGX {discountedPrice.toLocaleString()}
              </p>
              {shouldShowMOQ(settings) && (
                <p className="text-xs text-gray-500 mb-0.5">1 item (MOQ)</p>
              )}
              {shouldShowSKU(settings) && (
                <p className="text-[11px] text-gray-500 italic pb-2">
                  SKU: {product.sku || 'N/A'}
                </p>
              )}
           </div>
    </div>
  );

  const renderCompactX = () => (
         <div 
           className={`p-0 w-full mx-auto transition break-inside-avoid rounded-3xl cursor-pointer card`}
           onClick={onClick}
         >
                                                       <div className="relative w-full h-full sm:h-48 rounded-2xl overflow-hidden flex items-center justify-center">
         {/* Badges */}
         <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
           {/* Discount Badge */}
           {discount > 0 && (
                         <div className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
              {discount}% Discount
            </div>
           )}
           
           {/* Trending Badge */}
           {badge && (
             <div className="bg-[#FF9900] text-white text-xs font-medium px-2 py-1 rounded shadow-sm">
               {badge}
             </div>
           )}
         </div>
        
                                                                                                                                               <Image {...imageProps} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover transition-transform duration-300 group-hover:scale-105" style={{ objectPosition: 'center' }} />
      </div>
                                                                                                               <div className="px-0 text-center">
                             <p className="text-sm font-medium text-gray-800 truncate mb-0.5 pt-2" title={formatProductName(product.name, settings)}>{formatProductName(product.name, settings)}</p>
            <p className="text-sm text-gray-900 font-semibold mb-0.5">UGX {discountedPrice.toLocaleString()}</p>
            {shouldShowMOQ(settings) && (
              <p className="text-xs text-gray-500 mb-0.5">1 item (MOQ)</p>
            )}
            {shouldShowSKU(settings) && (
              <p className="text-[7px] text-gray-500 italic pb-2">SKU: {product.sku || "N/A"}</p>
            )}
         </div>
    </div>
  );

  switch (variant) {
    case 'landscape':
      return renderLandscape();
    case 'landscapemain':
      return renderLandscapeMain();
    case 'landscapemain02':
      return renderLandscapeMain02();
    case 'carousel':
      return renderCarousel();
    case 'mobilecarousel':
      return renderMobileCarousel();
    case 'portrait':
      return renderPortrait();
    case 'compact':
      return renderCompact();
    case 'compactX':
      return renderCompactX();
    default:
      return renderDefault();
  }
};

export default ProductCard;
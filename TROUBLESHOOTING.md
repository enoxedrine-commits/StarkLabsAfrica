# Troubleshooting Guide

## Issue: Product Images Not Displaying (404 Errors)

### Problem
Products show 404 errors for images from Firebase Storage:
```
⨯ upstream image response failed for https://firebasestorage.googleapis.com/v0/b/starklabsafrica.firebasestorage.app/o/products%2F... 404
```

### Root Cause
The product documents in Firestore have `imageUrl` fields pointing to images that don't exist in your new Firebase Storage bucket (`starklabsafrica`).

### Solutions

#### Option 1: Upload Images to New Storage (Recommended)
1. Go to Firebase Console → Storage
2. Upload product images to `products/` folder
3. Update product `imageUrl` fields in Firestore to point to new images

#### Option 2: Use Fallback Images (Temporary)
- The app now shows placeholder images when images fail to load
- Products will display but without actual product images
- You can add images later

#### Option 3: Migrate Images from Old Storage
1. Download images from old Firebase Storage (`helloquip-80e20`)
2. Upload to new Firebase Storage (`starklabsafrica`)
3. Run migration script to update URLs:
   ```bash
   node scripts/migrate-image-urls.js
   ```

### What Was Fixed
- ✅ Added error handling to ProductCard component
- ✅ Images now show fallback placeholder when 404 occurs
- ✅ Next.js Image optimization disabled for Firebase Storage URLs (prevents server-side 404s)
- ✅ Created ProductImage component with better error handling

---

## Issue: Categories Not Showing

### Problem
Categories section is empty or not displaying.

### Root Cause
The `categories` collection in Firestore is empty (no categories created yet).

### Solution

#### Create Categories in Firestore

**Option 1: Via Admin Panel (Easiest)**
1. Log in as admin
2. Go to Admin Panel → Categories
3. Click "Create Main Category"
4. Add categories:
   - Microcontrollers & Brains
   - Sensors & Modules
   - Power & Control
   - Prototyping Essentials
   - Starter & Project Kits

**Option 2: Via Firebase Console**
1. Go to Firebase Console → Firestore Database
2. Create collection: `categories`
3. Add documents with:
   ```json
   {
     "name": "Microcontrollers & Brains",
     "slug": "microcontrollers-brains",
     "parentId": null,
     "imageUrl": "url-to-category-image",
     "createdAt": "2026-01-27T..."
   }
   ```

**Option 3: Use Script (Coming Soon)**
- A script to seed default Maker categories will be created

### What Was Fixed
- ✅ Categories component now shows "All Products" even if no categories exist
- ✅ Better error handling for empty categories collection
- ✅ Helpful console messages when categories are empty

---

## Issue: Next.js Metadata Warnings

### Problem
```
⚠ Unsupported metadata viewport is configured in metadata export
⚠ Unsupported metadata themeColor is configured in metadata export
```

### Solution
✅ **FIXED** - Moved `viewport` and `themeColor` to separate `viewport` export in `app/layout.js`

---

## Quick Fixes Applied

1. **Image Error Handling**
   - ProductCard now shows placeholder when images fail
   - Firebase Storage URLs set to `unoptimized` to prevent server-side 404s
   - Created ProductImage component for better error handling

2. **Categories Display**
   - Always shows "All Products" category
   - Better error messages
   - Handles empty collection gracefully

3. **Metadata Warnings**
   - Fixed Next.js 15 metadata structure

---

## Next Steps

1. **Upload Product Images**
   - Go to Firebase Console → Storage
   - Upload images for your products
   - Or use admin panel to add products with images

2. **Create Categories**
   - Use admin panel to create Maker categories
   - Or manually add to Firestore

3. **Test**
   - Reload the page
   - Check browser console for any remaining errors
   - Verify images show (or placeholders if images don't exist)
   - Verify categories appear

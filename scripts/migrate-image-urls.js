/**
 * Migration Script: Update Product Image URLs from Old to New Firebase Storage
 * 
 * This script updates all product image URLs in Firestore to point to your new Firebase Storage bucket.
 * 
 * Usage:
 * 1. Make sure you have products in your new Firestore database
 * 2. Run: node scripts/migrate-image-urls.js
 * 
 * Options:
 * - DRY_RUN=true: Preview changes without updating (recommended first)
 * - OLD_BUCKET: Old storage bucket name (default: helloquip-80e20.firebasestorage.app)
 * - NEW_BUCKET: New storage bucket name (default: starklabsafrica.firebasestorage.app)
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Configuration
const OLD_BUCKET = process.env.OLD_BUCKET || 'helloquip-80e20.firebasestorage.app';
const NEW_BUCKET = process.env.NEW_BUCKET || 'starklabsafrica.firebasestorage.app';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to initialize from environment variable or service account file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountInline = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  let serviceAccount = null;
  
  if (serviceAccountInline) {
    serviceAccount = JSON.parse(serviceAccountInline);
  } else if (serviceAccountPath) {
    const fs = require('fs');
    const path = require('path');
    const resolved = path.isAbsolute(serviceAccountPath) 
      ? serviceAccountPath 
      : path.join(process.cwd(), serviceAccountPath);
    serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  } else {
    // Try default location
    const fs = require('fs');
    const path = require('path');
    const defaultDir = path.join(process.cwd(), 'server/firebase');
    if (fs.existsSync(defaultDir)) {
      const files = fs.readdirSync(defaultDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        const candidate = path.join(defaultDir, files[0]);
        serviceAccount = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
      }
    }
  }
  
  if (!serviceAccount) {
    console.error('❌ Firebase Admin not initialized. Please set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH');
    process.exit(1);
  }
  
  // Fix private_key newlines if needed
  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Replace old bucket URL with new bucket URL
 */
function replaceBucketUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Replace old bucket with new bucket
  return url.replace(
    new RegExp(OLD_BUCKET.replace(/\./g, '\\.'), 'g'),
    NEW_BUCKET
  );
}

/**
 * Update image URLs in a product document
 */
function updateProductImageUrls(productData) {
  const updates = {};
  
  // Update main imageUrl
  if (productData.imageUrl) {
    if (typeof productData.imageUrl === 'string') {
      const newUrl = replaceBucketUrl(productData.imageUrl);
      if (newUrl !== productData.imageUrl) {
        updates.imageUrl = newUrl;
      }
    } else if (typeof productData.imageUrl === 'object') {
      // Handle object with multiple sizes
      const updatedImageUrl = {};
      let hasChanges = false;
      for (const [size, url] of Object.entries(productData.imageUrl)) {
        const newUrl = replaceBucketUrl(url);
        updatedImageUrl[size] = newUrl;
        if (newUrl !== url) hasChanges = true;
      }
      if (hasChanges) {
        updates.imageUrl = updatedImageUrl;
      }
    }
  }
  
  // Update extraImageUrls array
  if (Array.isArray(productData.extraImageUrls) && productData.extraImageUrls.length > 0) {
    const updatedExtraUrls = productData.extraImageUrls.map(img => {
      if (typeof img === 'string') {
        return replaceBucketUrl(img);
      } else if (typeof img === 'object') {
        const updatedImg = {};
        for (const [size, url] of Object.entries(img)) {
          updatedImg[size] = replaceBucketUrl(url);
        }
        return updatedImg;
      }
      return img;
    });
    
    // Check if any changes were made
    const hasChanges = updatedExtraUrls.some((newImg, idx) => {
      const oldImg = productData.extraImageUrls[idx];
      return JSON.stringify(newImg) !== JSON.stringify(oldImg);
    });
    
    if (hasChanges) {
      updates.extraImageUrls = updatedExtraUrls;
    }
  }
  
  // Also check 'image' field (some products might use this)
  if (productData.image) {
    const newImage = replaceBucketUrl(productData.image);
    if (newImage !== productData.image) {
      updates.image = newImage;
    }
  }
  
  return updates;
}

/**
 * Main migration function
 */
async function migrateImageUrls() {
  console.log('🚀 Starting image URL migration...');
  console.log(`📦 Old bucket: ${OLD_BUCKET}`);
  console.log(`📦 New bucket: ${NEW_BUCKET}`);
  console.log(`🔍 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE (will update Firestore)'}`);
  console.log('');
  
  try {
    // Get all products
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No products found in Firestore.');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} products to check\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (const docSnap of snapshot.docs) {
      const productData = docSnap.data();
      const updates = updateProductImageUrls(productData);
      
      if (Object.keys(updates).length > 0) {
        console.log(`✅ Product "${productData.name || docSnap.id}":`);
        console.log(`   Updating: ${Object.keys(updates).join(', ')}`);
        
        if (!DRY_RUN) {
          batch.update(docSnap.ref, updates);
          batchCount++;
          
          // Commit batch if it reaches the limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`   💾 Committed batch of ${batchCount} updates`);
            batchCount = 0;
          }
        }
        
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    // Commit remaining updates
    if (!DRY_RUN && batchCount > 0) {
      await batch.commit();
      console.log(`   💾 Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products (no old URLs found)`);
    console.log(`   📊 Total: ${snapshot.size} products`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.');
      console.log('   Run without DRY_RUN=true to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateImageUrls()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

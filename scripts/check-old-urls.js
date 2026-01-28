/**
 * Check Script: Find Products with Old Firebase Storage URLs
 * 
 * This script scans your Firestore and reports which products have image URLs
 * pointing to the old Firebase Storage bucket.
 * 
 * Usage: node scripts/check-old-urls.js
 */

const admin = require('firebase-admin');

const OLD_BUCKET = process.env.OLD_BUCKET || 'helloquip-80e20.firebasestorage.app';

// Initialize Firebase Admin (same as migrate script)
if (!admin.apps.length) {
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
  
  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

function hasOldUrl(value) {
  if (!value) return false;
  if (typeof value === 'string') {
    return value.includes(OLD_BUCKET);
  }
  if (typeof value === 'object') {
    return Object.values(value).some(v => typeof v === 'string' && v.includes(OLD_BUCKET));
  }
  return false;
}

async function checkOldUrls() {
  console.log('🔍 Checking for products with old Firebase Storage URLs...');
  console.log(`📦 Looking for: ${OLD_BUCKET}\n`);
  
  try {
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No products found in Firestore.');
      return;
    }
    
    const productsWithOldUrls = [];
    
    for (const docSnap of snapshot.docs) {
      const productData = docSnap.data();
      const issues = [];
      
      if (hasOldUrl(productData.imageUrl)) {
        issues.push('imageUrl');
      }
      if (hasOldUrl(productData.image)) {
        issues.push('image');
      }
      if (Array.isArray(productData.extraImageUrls)) {
        const hasOldExtra = productData.extraImageUrls.some(hasOldUrl);
        if (hasOldExtra) {
          issues.push('extraImageUrls');
        }
      }
      
      if (issues.length > 0) {
        productsWithOldUrls.push({
          id: docSnap.id,
          name: productData.name || 'Unnamed',
          issues: issues
        });
      }
    }
    
    console.log(`📊 Found ${productsWithOldUrls.length} products with old URLs out of ${snapshot.size} total products\n`);
    
    if (productsWithOldUrls.length > 0) {
      console.log('Products needing update:');
      productsWithOldUrls.forEach((product, idx) => {
        console.log(`\n${idx + 1}. ${product.name} (ID: ${product.id})`);
        console.log(`   Fields with old URLs: ${product.issues.join(', ')}`);
      });
      
      console.log(`\n💡 To update these URLs, run: DRY_RUN=true node scripts/migrate-image-urls.js`);
      console.log(`   Then remove DRY_RUN=true to apply changes.`);
    } else {
      console.log('✅ All product image URLs are already pointing to the new storage bucket!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOldUrls()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

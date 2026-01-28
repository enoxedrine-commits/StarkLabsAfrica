/**
 * Verify Script: Check which Firebase project you're connected to
 * 
 * This script verifies that your app is reading from the correct Firestore database.
 * 
 * Usage: node scripts/verify-firestore-connection.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
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

async function verifyConnection() {
  console.log('🔍 Verifying Firestore Connection...\n');
  
  try {
    // Get project info from service account
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const serviceAccountInline = process.env.FIREBASE_SERVICE_ACCOUNT;
    const fs = require('fs');
    const path = require('path');
    
    let serviceAccountFile = null;
    if (serviceAccountPath) {
      const resolved = path.isAbsolute(serviceAccountPath) 
        ? serviceAccountPath 
        : path.join(process.cwd(), serviceAccountPath);
      if (fs.existsSync(resolved)) {
        serviceAccountFile = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
      }
    } else {
      const defaultDir = path.join(process.cwd(), 'server/firebase');
      if (fs.existsSync(defaultDir)) {
        const files = fs.readdirSync(defaultDir).filter(f => f.endsWith('.json'));
        if (files.length > 0) {
          const candidate = path.join(defaultDir, files[0]);
          serviceAccountFile = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
        }
      }
    }
    
    if (serviceAccountFile) {
      console.log(`📋 Service Account Project: ${serviceAccountFile.project_id || 'unknown'}`);
      console.log(`📋 Service Account Email: ${serviceAccountFile.client_email || 'unknown'}\n`);
      
      if (serviceAccountFile.project_id === 'helloquip-80e20') {
        console.log('⚠️  WARNING: Service account is for OLD project (helloquip-80e20)');
        console.log('   You need a service account for NEW project (starklabsafrica)\n');
      } else if (serviceAccountFile.project_id === 'starklabsafrica') {
        console.log('✅ Service account is for NEW project (starklabsafrica)\n');
      }
    }
    
    // Get project info from initialized app
    const projectId = admin.app().options.projectId || admin.app().options.credential?.projectId || 'unknown';
    console.log(`📦 Firebase Admin initialized for Project: ${projectId}\n`);
    
    // Check products collection
    console.log('📊 Checking products collection...');
    const productsRef = db.collection('products');
    const snapshot = await productsRef.limit(5).get();
    
    if (snapshot.empty) {
      console.log('⚠️  No products found in Firestore.');
      console.log('   This means your new Firestore database is empty.');
      console.log('   If you\'re seeing products in the app, they might be cached or coming from somewhere else.\n');
    } else {
      console.log(`✅ Found ${snapshot.size} product(s) in Firestore (showing first 5):\n`);
      
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(`${idx + 1}. ${data.name || 'Unnamed'} (ID: ${doc.id})`);
        
        // Check image URLs
        const imageUrl = data.imageUrl || data.image || '';
        if (typeof imageUrl === 'string') {
          if (imageUrl.includes('helloquip-80e20')) {
            console.log('   ⚠️  Image URL points to OLD storage bucket');
          } else if (imageUrl.includes('starklabsafrica')) {
            console.log('   ✅ Image URL points to NEW storage bucket');
          } else if (imageUrl) {
            console.log('   ℹ️  Image URL:', imageUrl.substring(0, 80) + '...');
          }
        }
        console.log('');
      });
      
      // Get total count
      const allProducts = await productsRef.get();
      console.log(`📈 Total products in database: ${allProducts.size}`);
    }
    
    // Check other collections
    console.log('\n📋 Checking other collections...');
    const collections = ['categories', 'orders', 'users', 'quoteRequests'];
    
    for (const collName of collections) {
      try {
        const collRef = db.collection(collName);
        const collSnapshot = await collRef.limit(1).get();
        console.log(`   ${collName}: ${collSnapshot.empty ? 'empty' : 'has data'}`);
      } catch (err) {
        console.log(`   ${collName}: error checking`);
      }
    }
    
    console.log('\n✅ Verification complete!');
    console.log('\n💡 Key Points:');
    console.log('   - If products exist here, they\'re in your NEW Firestore');
    console.log('   - If image URLs point to old storage, use migrate-image-urls.js to update them');
    console.log('   - If no products exist, your new database is empty (which is correct if you haven\'t migrated yet)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 7 || error.message.includes('permission') || error.message.includes('Permission')) {
      console.error('\n🔒 Permission Error Detected!\n');
      console.error('Possible causes:');
      console.error('1. Service account is for the WRONG Firebase project');
      console.error('   - Check if service account is for "helloquip-80e20" instead of "starklabsafrica"');
      console.error('   - You need a service account JSON file for your NEW project\n');
      console.error('2. Service account lacks Firestore permissions');
      console.error('   - Go to Firebase Console → Project Settings → Service Accounts');
      console.error('   - Generate a new service account key for "starklabsafrica" project\n');
      console.error('3. Firestore database doesn\'t exist yet');
      console.error('   - Go to Firebase Console → Firestore Database');
      console.error('   - Create database if it doesn\'t exist\n');
      console.error('💡 To fix:');
      console.error('   1. Go to https://console.firebase.google.com/');
      console.error('   2. Select your NEW project (starklabsafrica)');
      console.error('   3. Project Settings → Service Accounts');
      console.error('   4. Click "Generate New Private Key"');
      console.error('   5. Save the JSON file to server/firebase/');
      console.error('   6. Run this script again\n');
    }
    
    console.error('Full error:', error);
    process.exit(1);
  }
}

verifyConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

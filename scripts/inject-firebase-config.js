/**
 * Script to inject Firebase environment variables into the service worker
 * This runs before build to replace placeholders with actual env values
 */

const fs = require('fs');
const path = require('path');

const serviceWorkerPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
const templatePath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.template.js');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env.local file not found. Using process.env variables.');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Only set NEXT_PUBLIC_FIREBASE_* variables
    if (key.startsWith('NEXT_PUBLIC_FIREBASE_')) {
      process.env[key] = value;
    }
  }
}

// Load .env.local file
loadEnvFile();

// Read environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Check if template exists, if not create it from current file
if (!fs.existsSync(templatePath)) {
  // Read current service worker
  let swContent = fs.readFileSync(serviceWorkerPath, 'utf8');
  
  // Replace actual values with placeholders to create template
  swContent = swContent.replace(/apiKey: "[^"]*"/, 'apiKey: "{{NEXT_PUBLIC_FIREBASE_API_KEY}}"');
  swContent = swContent.replace(/authDomain: "[^"]*"/, 'authDomain: "{{NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}}"');
  swContent = swContent.replace(/projectId: "[^"]*"/, 'projectId: "{{NEXT_PUBLIC_FIREBASE_PROJECT_ID}}"');
  swContent = swContent.replace(/storageBucket: "[^"]*"/, 'storageBucket: "{{NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}}"');
  swContent = swContent.replace(/messagingSenderId: "[^"]*"/, 'messagingSenderId: "{{NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}}"');
  swContent = swContent.replace(/appId: "[^"]*"/, 'appId: "{{NEXT_PUBLIC_FIREBASE_APP_ID}}"');
  swContent = swContent.replace(/measurementId: "[^"]*"/, 'measurementId: "{{NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}}"');
  
  // Write template
  fs.writeFileSync(templatePath, swContent);
  console.log('✅ Created firebase-messaging-sw.template.js');
}

// Read template (or current file if template doesn't exist)
let swContent;
if (fs.existsSync(templatePath)) {
  swContent = fs.readFileSync(templatePath, 'utf8');
} else {
  swContent = fs.readFileSync(serviceWorkerPath, 'utf8');
}

// Replace placeholders with actual values
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_API_KEY}}/g, firebaseConfig.apiKey);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}}/g, firebaseConfig.authDomain);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_PROJECT_ID}}/g, firebaseConfig.projectId);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}}/g, firebaseConfig.storageBucket);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}}/g, firebaseConfig.messagingSenderId);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_APP_ID}}/g, firebaseConfig.appId);
swContent = swContent.replace(/{{NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}}/g, firebaseConfig.measurementId);

// Also replace any hardcoded project references
if (firebaseConfig.projectId) {
  swContent = swContent.replace(/helloquip-80e20/g, firebaseConfig.projectId);
}

// Validate configuration before writing
const missingVars = [];
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === '') missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
if (!firebaseConfig.authDomain || firebaseConfig.authDomain === '') missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
if (!firebaseConfig.projectId || firebaseConfig.projectId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
if (!firebaseConfig.storageBucket || firebaseConfig.storageBucket === '') missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
if (!firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseConfig.appId || firebaseConfig.appId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');

if (missingVars.length > 0) {
  console.error('❌ Error: Missing required Firebase environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\n💡 Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.');
  console.error('💡 Then restart your dev server: npm run dev\n');
  process.exit(1);
}

// Write the updated service worker
fs.writeFileSync(serviceWorkerPath, swContent);
console.log('✅ Injected Firebase config into firebase-messaging-sw.js');
console.log(`   Project ID: ${firebaseConfig.projectId}`);

// Validate that all placeholders were replaced
if (swContent.includes('{{')) {
  console.warn('⚠️  Warning: Some placeholders may not have been replaced');
  const matches = swContent.match(/{{[^}]+}}/g);
  if (matches) {
    console.warn('   Unreplaced placeholders:', matches);
  }
}

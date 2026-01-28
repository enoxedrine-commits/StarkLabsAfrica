/**
 * Client-Side Check: Verify which Firestore your app is connecting to
 * 
 * This script uses the client SDK (same as your app) to check Firestore connection.
 * No Admin SDK/service account needed!
 * 
 * Usage: 
 *   1. Make sure your app is running (npm run dev)
 *   2. Open browser console on http://localhost:3000
 *   3. Copy and paste this code, OR
 *   4. Run: node scripts/check-firestore-client.js (requires importing firebase config)
 */

// This is a browser console script - paste it in your browser console
// Or we can create a simple page that runs this

const checkFirestoreClient = `
// Check which Firebase project you're connected to
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsEP8dyJqNY8GL7zLbd72HYumCjKXWaVw",
  authDomain: "starklabsafrica.firebaseapp.com",
  projectId: "starklabsafrica",
  storageBucket: "starklabsafrica.firebasestorage.app",
  messagingSenderId: "842606943751",
  appId: "1:842606943751:web:2cde963ba9943d1d0194a2",
  measurementId: "G-ECH3K58VGV"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

console.log('🔍 Checking Firestore connection...');
console.log('📦 Project ID:', firebaseConfig.projectId);

// Try to read products
getDocs(collection(db, 'products'), limit(5))
  .then((snapshot) => {
    console.log('✅ Successfully connected to Firestore!');
    console.log('📊 Products found:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('⚠️  No products found - database is empty');
    } else {
      snapshot.docs.forEach((doc, idx) => {
        const data = doc.data();
        console.log(\`\${idx + 1}. \${data.name || 'Unnamed'} (ID: \${doc.id})\`);
        
        const imageUrl = data.imageUrl || data.image || '';
        if (typeof imageUrl === 'string') {
          if (imageUrl.includes('helloquip-80e20')) {
            console.log('   ⚠️  Image URL points to OLD storage');
          } else if (imageUrl.includes('starklabsafrica')) {
            console.log('   ✅ Image URL points to NEW storage');
          }
        }
      });
    }
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    if (error.code === 'permission-denied') {
      console.error('🔒 Permission denied - check Firestore security rules');
    }
  });
`;

console.log('📋 Browser Console Script:');
console.log('========================');
console.log(checkFirestoreClient);
console.log('\n💡 Instructions:');
console.log('   1. Start your app: npm run dev');
console.log('   2. Open http://localhost:3000 in browser');
console.log('   3. Open browser console (F12)');
console.log('   4. Copy the code above and paste in console');
console.log('   5. Press Enter to run\n');

// Also create a simple HTML page version
const htmlPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Firestore Connection Check</title>
  <script type="module">
    import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, collection, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    
    const firebaseConfig = {
      apiKey: "AIzaSyCsEP8dyJqNY8GL7zLbd72HYumCjKXWaVw",
      authDomain: "starklabsafrica.firebaseapp.com",
      projectId: "starklabsafrica",
      storageBucket: "starklabsafrica.firebasestorage.app",
      messagingSenderId: "842606943751",
      appId: "1:842606943751:web:2cde963ba9943d1d0194a2",
      measurementId: "G-ECH3K58VGV"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    document.getElementById('check').addEventListener('click', async () => {
      const output = document.getElementById('output');
      output.innerHTML = '🔍 Checking...<br>';
      
      try {
        const snapshot = await getDocs(collection(db, 'products'), limit(5));
        output.innerHTML += \`✅ Connected to Firestore!<br>\`;
        output.innerHTML += \`📦 Project: \${firebaseConfig.projectId}<br>\`;
        output.innerHTML += \`📊 Products found: \${snapshot.size}<br><br>\`;
        
        if (snapshot.empty) {
          output.innerHTML += '⚠️ Database is empty<br>';
        } else {
          snapshot.docs.forEach((doc, idx) => {
            const data = doc.data();
            output.innerHTML += \`\${idx + 1}. \${data.name || 'Unnamed'}<br>\`;
          });
        }
      } catch (error) {
        output.innerHTML += \`❌ Error: \${error.message}<br>\`;
      }
    });
  </script>
</head>
<body>
  <h1>Firestore Connection Check</h1>
  <button id="check">Check Connection</button>
  <div id="output"></div>
</body>
</html>
`;

console.log('\n📄 Or create a simple HTML page and open it in browser');
console.log('   (Save the HTML above to a file and open it)');

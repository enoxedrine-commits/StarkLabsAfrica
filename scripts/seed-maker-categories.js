/**
 * Seed Maker Categories Script
 * 
 * Creates default Maker/Lab product categories in Firestore
 * 
 * Usage: node scripts/seed-maker-categories.js
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

const makerCategories = [
  {
    name: "Microcontrollers & Brains",
    slug: "microcontrollers-brains",
    description: "Arduino, ESP32, Raspberry Pi, STM32 and more",
    icon: "🔌",
    parentId: null,
  },
  {
    name: "Sensors & Modules",
    slug: "sensors-modules",
    description: "Ultrasonic, PIR, IR, Gas, Temp, Humidity, RFID, NFC sensors",
    icon: "📡",
    parentId: null,
  },
  {
    name: "Power & Control",
    slug: "power-control",
    description: "Relays, Motor drivers, Motors, Servos, Converters",
    icon: "⚡",
    parentId: null,
  },
  {
    name: "Prototyping Essentials",
    slug: "prototyping-essentials",
    description: "Breadboards, Jumper wires, Resistors, Capacitors, Soldering kits",
    icon: "🧰",
    parentId: null,
  },
  {
    name: "Starter & Project Kits",
    slug: "starter-project-kits",
    description: "Complete kits for Smart Home, Robotics, IoT, Solar projects",
    icon: "🤖",
    parentId: null,
  },
];

function generateSlug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function seedCategories() {
  console.log('🌱 Seeding Maker categories...\n');
  
  try {
    // Check existing categories
    const existingSnapshot = await db.collection('categories').get();
    const existingSlugs = new Set();
    existingSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.slug) existingSlugs.add(data.slug);
    });

    let created = 0;
    let skipped = 0;

    for (const category of makerCategories) {
      // Check if category already exists
      if (existingSlugs.has(category.slug)) {
        console.log(`⏭️  Skipped: "${category.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create category document
      await db.collection('categories').add({
        ...category,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Created: "${category.name}" (${category.icon})`);
      created++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created} categories`);
    console.log(`   ⏭️  Skipped: ${skipped} categories (already exist)`);
    console.log(`   📦 Total: ${makerCategories.length} categories\n`);

    if (created > 0) {
      console.log('💡 Next steps:');
      console.log('   1. Go to Admin Panel → Categories');
      console.log('   2. Upload images for each category');
      console.log('   3. Add products to these categories\n');
    }

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

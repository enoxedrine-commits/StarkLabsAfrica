# Image URL Migration Scripts

## The Problem

Your app is correctly connected to your **new Firebase project** (`starklabsafrica`), but the product documents in Firestore contain `imageUrl` fields that point to the **old Firebase Storage** (`helloquip-80e20.firebasestorage.app`).

**Why this happens:**
- When you migrated/copied product data from the old Firestore to the new one, the image URLs in the documents still pointed to the old storage bucket
- Firebase Storage URLs are public and don't expire, so they still work
- But you're using storage from the old project, which isn't ideal

## Your Options

### Option 1: Keep Using Old Storage URLs (Temporary)
- ✅ Works immediately
- ❌ Still dependent on old Firebase project
- ❌ Can't manage images in your new project
- ⚠️ If old project is deleted, images will break

### Option 2: Migrate Images to New Storage (Recommended)
1. **Download images** from old storage
2. **Upload images** to new storage  
3. **Update URLs** in Firestore to point to new storage

### Option 3: Update URLs Only (If Images Already Migrated)
If you've already uploaded images to your new storage, just update the URLs in Firestore.

## Scripts Available

### 1. Check Old URLs (`check-old-urls.js`)
Scans your Firestore and reports which products have old storage URLs.

```bash
node scripts/check-old-urls.js
```

### 2. Migrate Image URLs (`migrate-image-urls.js`)
Updates all product image URLs in Firestore to point to your new storage bucket.

**Dry run (preview changes):**
```bash
DRY_RUN=true node scripts/migrate-image-urls.js
```

**Apply changes:**
```bash
node scripts/migrate-image-urls.js
```

**Custom buckets:**
```bash
OLD_BUCKET=old-project.firebasestorage.app NEW_BUCKET=new-project.firebasestorage.app node scripts/migrate-image-urls.js
```

## Setup Required

The scripts need Firebase Admin credentials. Set one of these:

**Option A: Environment Variable**
```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

**Option B: Service Account File Path**
```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=server/firebase/serviceAccountKey.json
```

**Option C: Default Location**
Place your service account JSON file in `server/firebase/` directory.

## What the Migration Script Does

1. Scans all products in your Firestore `products` collection
2. Finds image URLs containing the old bucket name
3. Replaces them with the new bucket name
4. Updates both `imageUrl` and `extraImageUrls` fields
5. Handles both string URLs and object URLs (with multiple sizes)

## Important Notes

⚠️ **Before running migration:**
- Make sure you have a backup of your Firestore data
- Test with `DRY_RUN=true` first
- Ensure images exist in your new storage (or they'll break)

⚠️ **The script only updates URLs, it doesn't migrate actual image files!**
- You need to manually download from old storage and upload to new storage
- Or use Firebase Storage migration tools

## Manual Migration Steps

If you prefer to migrate manually:

1. **Export products from Firestore** (Firebase Console → Firestore → Export)
2. **Download images** from old storage (Firebase Console → Storage)
3. **Upload images** to new storage
4. **Update image URLs** in exported JSON
5. **Import back** to Firestore

Or use the script to automate step 4!

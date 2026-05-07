const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('[Firebase] ✅ Admin SDK initialized');
    return db;
  } catch (error) {
    console.error('[Firebase] ❌ Failed to initialize:', error.message);
    throw error;
  }
}

function getDb() {
  if (!db) return initFirebase();
  return db;
}

module.exports = { initFirebase, getDb, admin };
